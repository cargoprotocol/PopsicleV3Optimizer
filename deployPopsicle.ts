import { ethers } from "hardhat";
import hre from 'hardhat';
import { constants, BigNumber } from "ethers";
import { deployStrategy } from "./test/shared/popsicle/helpers/deployers/deploy-strategy";
import {POPSICLE_V3_OPTIMIZER_PATH, deploy, FeeAmount, IErc20} from "./test/shared";
import { PopsicleV3Optimizer, UniswapV3Pool, SwapRouter, ERC20 } from './typechain';

// mainnet addresses. Mainnet fork expected locally.
const TOKENS: IErc20[] = [
    { name: "T0", symbol: "T0" },
    { name: "T1", symbol: "T1" }
];

async function main() {
    const [user, deployer] = await ethers.getSigners();

    const strategy = await deployStrategy();
    console.log(`Strategy deployed at ${strategy.address}`);

    const state = await deploy(deployer, { feeAmount: FeeAmount.MEDIUM, tokens: TOKENS, priceSqrtRange: [1, 2] });
    
    const pool: UniswapV3Pool = state.pool.pool;
    console.log(`Uniswap pool deployed at ${pool.address}`);
    const token0: ERC20 = state.pool.token0;
    console.log(`Token0 deployed at ${token0.address}`);
    const token1: ERC20 = state.pool.token1;
    console.log(`Token1 deployed at ${token1.address}`);

    const router = state.router;
    
    const contractFactory = await ethers.getContractFactory(POPSICLE_V3_OPTIMIZER_PATH);
    const contract = (await contractFactory.deploy(pool.address, strategy.address)) as PopsicleV3Optimizer;   
    console.log(`Popsicle pool deployed at ${contract.address}`);    

    const ilanTestWallet = "0x535CDe0F8339CD4b5bb5804f1DcaAE239920bB7D";
    for(let token of [token0, token1]){
      // await token.approve(contract.address, constants.MaxUint256);
      // await token.connect(other).approve(contract.address, constants.MaxUint256);
      // await token.approve(router.address, constants.MaxUint256);
      // await token.connect(other).approve(router.address, constants.MaxUint256);
      await token.transfer(ilanTestWallet, BigNumber.from(10000).mul(BigNumber.from(10).pow(18)));
  }

    await contract.init();
    console.log(`Popsicle pool initialized`);    
}

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });