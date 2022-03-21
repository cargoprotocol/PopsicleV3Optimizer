import { ethers } from "hardhat";
import { PopsicleV3Optimizer, IUniswapV3Pool, ERC20 } from "../../typechain";
import PopsicleV3OptimizerArtifact from "../../artifacts/contracts/popsicle-v3-optimizer/PopsicleV3Optimizer.sol/PopsicleV3Optimizer.json"
import IUniswapV3PoolArtifact from "../../artifacts/contracts/popsicle-v3-optimizer/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import ERC20Artifact from "../../artifacts/contracts/helpers/token/ERC20.sol/ERC20.json";

const POPSICLE_V3_OPTIMIZER_ADDRESS = '0x53021b9816B4c4b158BB0b6bf0dFB714Cc5c890C';

const EXTERNAL_ACCOUNT = '0xd90df52e5674763f9bc9996ebe2be89084ece7ff';
const BLOCK_NUMBER = 10340785 || 'latest';

export async function logPopsicleV3OptimizerState (address: string) {
  const optimizer = (await ethers.getContractAt(
    PopsicleV3OptimizerArtifact.abi,
    address,
  )) as PopsicleV3Optimizer;

  const token0Address = await optimizer.token0();
  console.log(`token0Address=${token0Address}`);
  const token0 = (await ethers.getContractAt(
    ERC20Artifact.abi,
    token0Address,
  ) as ERC20);
  const token0Name = await token0.name();
  console.log(`token0Name=${token0Name}`);
  const token0Decimals = await token0.decimals();
  console.log(`token0Decimals=${token0Decimals}`);
  const token0Balance = await token0.balanceOf(EXTERNAL_ACCOUNT, {blockTag: BLOCK_NUMBER});
  console.log(`token0Balance=${token0Balance}`);

  const token1Address = await optimizer.token1();
  console.log(`token1Address=${token1Address}`);
  const token1 = (await ethers.getContractAt(
    ERC20Artifact.abi,
    token1Address,
  ) as ERC20);
  const token1Name = await token1.name();
  console.log(`token1Name=${token1Name}`);
  const token1Decimals = await token1.decimals();
  console.log(`token1Decimals=${token1Decimals}`);
  const token1Balance = await token1.balanceOf(EXTERNAL_ACCOUNT, {blockTag: BLOCK_NUMBER});
  console.log(`token1Balance=${token1Balance}`);

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

  // Not working
  // const tx = await pool.mint(address, tickLower, tickUpper, 1, [], { gasLimit: 1000000, });
  // tx.wait();
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
