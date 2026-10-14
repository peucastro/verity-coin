import hre from "hardhat"
import { parseUnits } from "viem"
import { explorer, polkadotHubTestnet } from "./network"

const name = "Verity"
const symbol = "VRTY"
const initialSupply = parseUnits("1000000", 18)
const maxSupply = parseUnits("2000000", 18)
const inflationBps = 50n // 0.5% a.a.
const feeBps = 500n // 5% por transferência

async function main() {
  const publicClient = await hre.viem.getPublicClient({ chain: polkadotHubTestnet })
  const [wallet] = await hre.viem.getWalletClients({ chain: polkadotHubTestnet })
  const { abi, bytecode } = await hre.artifacts.readArtifact("Moeda")
  console.log(`deployer ${wallet.account.address}`)

  const hash = await wallet.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    args: [name, symbol, initialSupply, maxSupply, inflationBps, feeBps],
    account: wallet.account,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
  if (!receipt.contractAddress) throw new Error("no contract address")

  console.log(JSON.stringify({ symbol, address: receipt.contractAddress, hash, block: receipt.blockNumber.toString() }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
