import { ethers, network } from "hardhat";
import { PopsicleV3Optimizer, IUniswapV3Pool } from "../typechain";
import PopsicleV3OptimizerArtifact from "../artifacts/contracts/popsicle-v3-optimizer/PopsicleV3Optimizer.sol/PopsicleV3Optimizer.json"
import IUniswapV3PoolArtifact from "../artifacts/contracts/popsicle-v3-optimizer/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";

import * as dotenv from "dotenv";
dotenv.config();
const ALCHEMY_ID = process.env.ALCHEMY_ID;
const DEPLOYER_PK = process.env.DEPLOYER_PK || "";

const POPSICLE_V3_OPTIMIZER_ADDRESS = '0xE5EBeCB5E5E156B51F2F8f8E14B82b5f5F5a7B94';

function getProviderURL(networkName: string): string {
  switch (networkName) {
    case "localhost":
      return "http://localhost:8545";
    default:
      return `https://eth-${networkName}.alchemyapi.io/v2/${ALCHEMY_ID}`;
  }
}

export async function logPopsicleV3OptimizerState (address: string) {
  const provider = ethers.getDefaultProvider(getProviderURL(network.name));
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);

  const optimizer = (await ethers.getContractAt(
    PopsicleV3OptimizerArtifact.abi,
    address,
    wallet,
  )) as PopsicleV3Optimizer;

  const rebalance = await optimizer.rebalance({ gasLimit: 10000000 });
  rebalance.wait(2);
}

async function main() {
  await logPopsicleV3OptimizerState(POPSICLE_V3_OPTIMIZER_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
      console.error(error);
      process.exit(1);
  });
