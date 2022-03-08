import { ethers } from "hardhat";
import { PopsicleV3Optimizer, IUniswapV3Pool } from "../../typechain";
import PopsicleV3OptimizerArtifact from "../../artifacts/contracts/popsicle-v3-optimizer/PopsicleV3Optimizer.sol/PopsicleV3Optimizer.json"
import IUniswapV3PoolArtifact from "../../artifacts/contracts/popsicle-v3-optimizer/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";

const POPSICLE_V3_OPTIMIZER_ADDRESS = '0xE5EBeCB5E5E156B51F2F8f8E14B82b5f5F5a7B94';

export async function logPopsicleV3OptimizerState (address: string) {
  const optimizer = (await ethers.getContractAt(
    PopsicleV3OptimizerArtifact.abi,
    address,
  )) as PopsicleV3Optimizer;

  const tickLower = await optimizer.tickLower();
  console.log(`tickLower=${tickLower}`);

  const tickUpper = await optimizer.tickUpper();
  console.log(`tickUpper=${tickUpper}`);

  const poolAddress = await optimizer.pool();
  const pool = (await ethers.getContractAt(
    IUniswapV3PoolArtifact.abi,
    poolAddress,
  )) as IUniswapV3Pool;
  console.log(`poolAddress=${poolAddress}`);

  const slot0 = await pool.slot0();
  console.log(`slot0=${slot0}`);
  const tx = await pool.mint(address, tickLower, tickUpper, 1, [], { gasLimit: 1000000, });
  tx.wait();
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
