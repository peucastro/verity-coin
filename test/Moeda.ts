import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers"
import { expect } from "chai"
import hre from "hardhat"
import { parseUnits } from "viem"

const million = parseUnits("1000000", 18)
const YEAR = 365n * 24n * 60n * 60n

async function deployVerity() {
  const [owner, alice, bob] = await hre.viem.getWalletClients()
  const moeda = await hre.viem.deployContract("Moeda", ["Verity", "VRTY", million, 2n * million, 50n, 500n])
  return { moeda, owner, alice, bob }
}

describe("Moeda (Verity)", () => {
  it("mints the initial supply to the owner and sets a 2M cap", async () => {
    const { moeda, owner } = await loadFixture(deployVerity)
    expect(await moeda.read.name()).to.equal("Verity")
    expect(await moeda.read.symbol()).to.equal("VRTY")
    expect(await moeda.read.decimals()).to.equal(18)
    expect(await moeda.read.balanceOf([owner.account.address])).to.equal(million)
    expect(await moeda.read.maxSupply()).to.equal(2n * million)
    expect((await moeda.read.treasury()).toLowerCase()).to.equal(owner.account.address.toLowerCase())
  })

  it("charges a 5% fee on top, paid to the treasury, which pays none", async () => {
    const { moeda, owner, alice, bob } = await loadFixture(deployVerity)
    // owner is the treasury: no fee on its transfers
    await moeda.write.transfer([alice.account.address, 1000n])
    expect(await moeda.read.balanceOf([alice.account.address])).to.equal(1000n)
    // alice pays 100 + 5% = 105
    await moeda.write.transfer([bob.account.address, 100n], { account: alice.account })
    expect(await moeda.read.balanceOf([bob.account.address])).to.equal(100n)
    expect(await moeda.read.balanceOf([alice.account.address])).to.equal(895n)
    expect(await moeda.read.balanceOf([owner.account.address])).to.equal(million - 1000n + 5n)
    expect(await moeda.read.feeFor([100n])).to.equal(5n)
  })

  it("mints 0.5% inflation for a year, proportional to time", async () => {
    const { moeda, owner } = await loadFixture(deployVerity)
    await time.increase(YEAR)
    await moeda.write.mintInflation()
    const supply = await moeda.read.totalSupply()
    const expected = million + (million * 50n) / 10_000n // 0.5% de 1M = 5000
    expect(supply >= expected).to.equal(true)
    expect(supply < expected + parseUnits("1", 18)).to.equal(true) // tolera segundos extra
    expect(await moeda.read.balanceOf([owner.account.address])).to.equal(supply)
  })

  it("never mints above the maximum", async () => {
    const { moeda } = await loadFixture(deployVerity)
    await time.increase(1000n * YEAR)
    expect(await moeda.read.pendingInflation()).to.equal(million)
    await moeda.write.mintInflation()
    expect(await moeda.read.totalSupply()).to.equal(2n * million)
  })

  it("rejects inflation minted by anyone but the owner", async () => {
    const { moeda, alice } = await loadFixture(deployVerity)
    await time.increase(YEAR)
    await expect(moeda.write.mintInflation({ account: alice.account })).to.be.rejected
  })
})
