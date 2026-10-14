import hre from "hardhat"
import { getAddress, parseUnits } from "viem"
import { polkadotHubTestnet } from "./network"

const token = process.env.COIN_ADDRESS as `0x${string}`
const to = getAddress(process.env.TO ?? "0x4Da06C4382D3A145A954981dE969c11DB9Ced416")
const amount = parseUnits(process.env.AMOUNT ?? "100", 18)

async function main() {
  if (!token) throw new Error("set COIN_ADDRESS")
  const publicClient = await hre.viem.getPublicClient({ chain: polkadotHubTestnet })
  const [wallet] = await hre.viem.getWalletClients({ chain: polkadotHubTestnet })
  const { abi } = await hre.artifacts.readArtifact("Moeda")
  console.log(`sender ${wallet.account.address}`)

  const hash = await wallet.writeContract({
    address: token,
    abi,
    functionName: "transfer",
    args: [to, amount],
    account: wallet.account,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
  if (receipt.status !== "success") throw new Error(`tx failed ${hash}`)

  console.log(JSON.stringify({ token, to, amount: amount.toString(), hash, block: receipt.blockNumber.toString() }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
