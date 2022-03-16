import { constants } from "ethers";
import { ethers, network } from "hardhat";
import { OptimizerStrategy, PopsicleV3Optimizer, UniswapV3Pool } from "../typechain";
import UniswapV3FactoryArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import UniswapV3PoolArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";

const OPTIMIZER_STRATEGY_PATH = "contracts/popsicle-v3-optimizer/OptimizerStrategy.sol:OptimizerStrategy";
const POPSICLE_V3_OPTIMIZER_PATH = "contracts/popsicle-v3-optimizer/PopsicleV3Optimizer.sol:PopsicleV3Optimizer";

const UNISWAP_V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

function getUSDCAddress(networkName: string): string {
  switch (networkName) {
    case "localhost": // mainnet forking
      return "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    case "rinkeby":
      return "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b";
    default:
      throw new Error(`Network ${networkName} not supported`)
  }
}

function getDAIAddress(networkName: string): string {
  switch (networkName) {
    case "localhost": // mainnet forking
      return "0x6b175474e89094c44da98b954eedeac495271d0f";
    case "rinkeby":
      return "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735";
    default:
      throw new Error(`Network ${networkName} not supported`)
  }
}

function getWETHAddress(networkName: string): string {
  switch (networkName) {
    case "localhost": // mainnet forking
      return "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    case "rinkeby":
      return "0xc778417e063141139fce010982780140aa0cd5ab";
    default:
      throw new Error(`Network ${networkName} not supported`)
  }
}

function getTickFloor(tick: number, tickSpacing: number) {
  let compressed = Math.floor(tick / tickSpacing);
  if (tick < 0 && tick % tickSpacing != 0) {
    compressed--;
  }
  return compressed * tickSpacing;
}

function getTickRangeMultiplier(tick: number, tickSpacing: number) {
  // based on https://github.com/Popsicle-Finance/PopsicleV3Optimizer/blob/c94a08c47a4d272a60a5924a6796bd0236567657/contracts/popsicle-v3-optimizer/PopsicleV3Optimizer.sol#L178

  const ABS_MAX_TICK = 887272;
  const tickFloor = getTickFloor(tick, tickSpacing);

  // tickFloor - tickRangeMultiplier * tickSpacing >= -ABS_MAX_TICK;
  const tickRangeMultiplier1 = Math.floor((tickFloor + ABS_MAX_TICK) / tickSpacing);

  // tickFloor + tickRangeMultiplier * tickSpacing <= ABS_MAX_TICK;
  const tickRangeMultiplier2 = Math.floor((ABS_MAX_TICK - tickFloor) / tickSpacing);

  const tickRangeMultiplier = Math.min(tickRangeMultiplier1, tickRangeMultiplier2);

  // decrease a little since uniswap pool state can change between this calculation and popsiclev3optimizer deploy transaction is mined
  return Math.floor(tickRangeMultiplier * 0.95);
}

async function createUniswapPool(token0Address: string, token1Address: string, fee: number) {
  const uniswapFactory = await ethers.getContractAt(
    UniswapV3FactoryArtifact.abi,
    UNISWAP_V3_FACTORY_ADDRESS,
  );

  try {
    const createUniswapPoolTransaction = await uniswapFactory.createPool(
      token0Address,
      token1Address,
      fee,
      {
        gasLimit: 1000000,
      },
    );

    await createUniswapPoolTransaction.wait();
  } catch {
    // transaction fails if pool already exists
    // TODO: open a PR in Uniswap/v3-core to properly set fail codes
  }

  const poolAddress = await uniswapFactory.getPool(token0Address, token1Address, fee);
  if (ethers.BigNumber.from(poolAddress).eq(ethers.BigNumber.from(0))) {
    throw new Error("poolAddress is 0");
  }
  console.log(`poolAddress=${poolAddress}`)

  const pool = await ethers.getContractAt(
    UniswapV3PoolArtifact.abi,
    poolAddress,
  ) as UniswapV3Pool;
  const slot0 = await pool.slot0();
  console.log(`pool.slot0=${JSON.stringify(slot0)}`);
  const tickSpacing = await pool.tickSpacing();
  console.log(`pool.tickSpacing=${tickSpacing}`);
  const tickRangeMultiplier = getTickRangeMultiplier(slot0.tick, tickSpacing);
  console.log(`tickRangeMultiplier=${tickRangeMultiplier}`)

  return {
    poolAddress,
    tickRangeMultiplier,
  };
}

async function deployPopsicle(token0Address: string, token1Address: string, fee: number) {
  const { poolAddress, tickRangeMultiplier } = await createUniswapPool(token0Address, token1Address, fee);

  const strategyFactory = await ethers.getContractFactory(OPTIMIZER_STRATEGY_PATH);
  const strategy = await strategyFactory.deploy(100, 40, tickRangeMultiplier, 2000, constants.MaxUint256) as OptimizerStrategy;
  console.log(`strategy.address=${strategy.address}`);

  const optimizerFactory = await ethers.getContractFactory(POPSICLE_V3_OPTIMIZER_PATH);
  const optimizerContract = (await optimizerFactory.deploy(poolAddress, strategy.address)) as PopsicleV3Optimizer;
  const initTransaction = await optimizerContract.init({ gasLimit: 1000000 });
  await initTransaction.wait();
  console.log(`optimizerContract.address=${optimizerContract.address}`)
}

async function main() {
  const daiAddress = getDAIAddress(network.name);
  const wethAddress = getWETHAddress(network.name);
  const usdcAddress = getUSDCAddress(network.name);

  console.log("Deploying USDC/DAI 0.05");
  await deployPopsicle(usdcAddress, daiAddress, 500);

  console.log("Deploying USDC/WETH 0.3");
  await deployPopsicle(usdcAddress, wethAddress, 3000);

  console.log("Deploying WETH/DAI 0.3");
  await deployPopsicle(wethAddress, daiAddress, 3000);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
      console.error(error);
      process.exit(1);
  });
