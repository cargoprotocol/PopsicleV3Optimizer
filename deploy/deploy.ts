import { constants } from "ethers";
import { ethers, network } from "hardhat";
import { OptimizerStrategy, PopsicleV3Optimizer } from "../typechain";
import UniswapV3FactoryArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"

const OPTIMIZER_STRATEGY_PATH = "contracts/popsicle-v3-optimizer/OptimizerStrategy.sol:OptimizerStrategy";
const POPSICLE_V3_OPTIMIZER_PATH = "contracts/popsicle-v3-optimizer/PopsicleV3Optimizer.sol:PopsicleV3Optimizer";

const UNISWAP_V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

const FEE = 3000;

function getDAIAddress(networkName: string): string {
  switch (networkName) {
    case "localhost": // mainnet forking
      return "0x6b175474e89094c44da98b954eedeac495271d0f";
    case "rinkeby":
      return "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea";
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

async function createUniswapPool() {
  const daiAddress = getDAIAddress(network.name);
  const wethAddress = getWETHAddress(network.name);

  const uniswapFactory = await ethers.getContractAt(
    UniswapV3FactoryArtifact.abi,
    UNISWAP_V3_FACTORY_ADDRESS,
  );

  try {
    const createUniswapPoolTransaction = await uniswapFactory.createPool(
      daiAddress,
      wethAddress,
      FEE,
      {
        gasLimit: 1000000,
      },
    );

    await createUniswapPoolTransaction.wait(2);
  } catch {
    // transaction fails if pool already exists
    // TODO: open a PR in Uniswap/v3-core to properly set fail codes
  }

  const poolAddress = await uniswapFactory.getPool(daiAddress, wethAddress, FEE);
  if (ethers.BigNumber.from(poolAddress).eq(ethers.BigNumber.from(0))) {
    throw new Error("poolAddress is 0");
  }

  console.log(`poolAddress=${poolAddress}`)
  return poolAddress;
}

async function main() {
  // const poolAddress = await createUniswapPool();

  const strategyFactory = await ethers.getContractFactory(OPTIMIZER_STRATEGY_PATH);
  const strategy = await strategyFactory.deploy(100, 40, 16, 2000, constants.MaxUint256) as OptimizerStrategy;
  console.log(`strategy.address=${strategy.address}`);

  const uniswapPoolsRinkeby = [
    "0x0f04024bdA15F6e5D48Ed92938654a6449F483ed", // WETH/DAI
    "0xfbDc20aEFB98a2dD3842023f21D17004eAefbe68", // usdc/weth
    "0x74D15a18796607EEE439C2259C09a5D6D051Ef87" // usdc/dai
  ];
  for (let i = 0; i < uniswapPoolsRinkeby.length; i++) {
    console.log(`Deploying popsicle to uniswap pool ${uniswapPoolsRinkeby[i]}`);
    const optimizerFactory = await ethers.getContractFactory(POPSICLE_V3_OPTIMIZER_PATH);
    const optimizerContract = (await optimizerFactory.deploy(uniswapPoolsRinkeby[i], strategy.address)) as PopsicleV3Optimizer;
    await optimizerContract.init();
    console.log(`Popsicle pool deployed to ${optimizerContract.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
      console.error(error);
      process.exit(1);
  });
