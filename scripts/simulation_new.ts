import hre, { ethers } from "hardhat";
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from "ethers/lib/utils";
import {
  Arb__factory,
  Arb,
  IUniswapV2Router02__factory,
  IUniswapV2Router02,
} from "../typechain";
import axios from "axios";
import _ from "lodash";
import { IARBITEM } from "../test/types";
import { BigNumber, FixedNumber, providers } from "ethers";
import { getMaxListeners } from "process";

const ARB_CONTRACT_ADDRESS = "0x54db0E6bb95D5C188E2D96d971B871Cb75A862E0";
const INVESTMENT_ASSET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const ARB_ENDPOINT = "http://65.108.206.172:8080/arb";

interface TXDATA {
  _token1: string;
  _token2: string;
  _router1: string;
  _router2: string;
  _investAmount: BigNumber;
  _token1_name: string;
  _token2_name: string;
}

interface SIMULATION {
  success: boolean;
  invest: BigNumber;
  profit: BigNumber;
  // gas: BigNumber;
  token1?: string;
  token2?: string;
  router1?: string;
  router2?: string;
  investAmount?: BigNumber;
  token1_name?: string;
  token2_name?: string;
}

const gasParams = {
  gasLimit: "4000000",
  gasPrice: parseUnits("35", "gwei"),
};

// const eip1559gasParams: feeData = {};

let maxFeePerGas = ethers.BigNumber.from("0");
let maxPriorityFeePerGas = ethers.BigNumber.from("0");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("BLOCK NUMBER: ", await ethers.provider.getBlockNumber());
  const contract = Arb__factory.connect(ARB_CONTRACT_ADDRESS, deployer);

  const data = await fetchArbitrageData();

  let feeData = await deployer.provider?.getFeeData();
  maxFeePerGas = feeData?.maxFeePerGas!;
  maxPriorityFeePerGas = parseUnits("1", "gwei");
  gasParams.gasPrice = maxPriorityFeePerGas;

  console.log("Total : ", data.length);

  let _consolaTable = [];

  for (let arbItem of data) {
    // console.log(arbItem);

    let path0 = [arbItem.Path[0].swapFrom, arbItem.Path[0].swapTo];
    let path1 = [arbItem.Path[1].swapFrom, arbItem.Path[1].swapTo];

    const router1_contract = IUniswapV2Router02__factory.connect(
      arbItem.Path[0].router,
      deployer
    );

    const router2_contract = IUniswapV2Router02__factory.connect(
      arbItem.Path[1].router,
      deployer
    );

    const amountsOut1 = await router1_contract.getAmountOut(
      parseEther(arbItem.Path[0].swapAmountFrom.toFixed(18)),
      arbItem.Path[0].swapFrom,
      arbItem.Path[0].swapTo
    );

    const amountsOut2 = await router2_contract.getAmountOut(
      amountsOut1,
      arbItem.Path[1].swapFrom,
      arbItem.Path[1].swapTo
    );

    const profit = amountsOut2.sub(
      parseEther(arbItem.Path[0].swapAmountFrom.toFixed(18))
    );

    if (!profit.isNegative()) {
      //   console.log("Amount From : ", arbItem.Path[0].swapAmountFrom.toFixed(18));
      console.log("amountsOut1: ", amountsOut1.toString());
      console.log("amountsOut2: ", amountsOut2.toString());
      console.log("Profit : ", profit.toString());
    }
  }
  console.log("-------------------");
  console.log("Finish !!!");

  //   for (let _arbItem of data) {
  //     let txData = extractTransactionData(_arbItem);
  //     let simulationResult = await simulateTransaction(contract, txData);

  //     console.log("Simulation result :  ", simulationResult.success);

  //     if (simulationResult.success) {
  //       let {
  //         invest,
  //         profit,
  //         // gas,
  //         token1,
  //         token2,
  //         router1,
  //         router2,
  //         investAmount,
  //       } = simulationResult;

  //       // Final Profit = profit - invest - gas(fee) Must be > 0
  //       // console.log(
  //       //   profit.sub(invest).sub(gas),
  //       //   "is Profitable? ",
  //       //   profit.sub(invest).sub(gas).gt(0),
  //       //   "Without Gas ? ",
  //       //   profit.sub(invest).gt(0)
  //       // );

  //       let { gas } = await esitmateGas(contract, txData);
  //       console.log("Gas Result : ", gas);

  //       _consolaTable.push({
  //         Investment: parseFloat(formatUnits(invest, 18)),
  //         Profit: parseFloat(formatUnits(profit, 18)),
  //         GasFee: parseFloat(formatUnits(gas, 18)),
  //         "Profitable?(With Gas)": profit.sub(invest).sub(gas).gt(0),
  //         "Profitable?(Without Gas)": profit.sub(invest).gt(0),
  //         token1: token1,
  //         token2: token2,
  //         token1_name: txData._token1_name,
  //         token2_name: txData._token2_name,
  //       });

  //       console.log("-----------------------");

  // if (profit.sub(invest).sub(gas).gt(0)) {
  //   await contract.startArbitrage(
  //     txData._token1,
  //     txData._token2,
  //     txData._router2,
  //     txData._router1,
  //     txData._investAmount,
  //     {
  //       maxFeePerGas: maxFeePerGas,
  //       maxPriorityFeePerGas: maxPriorityFeePerGas,
  //     }
  //   );
  // }
  //     }
  //   }

  //   console.table(_consolaTable);

  // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 = WETH
  //   let { _balance: endBalance } = await contract.getContractErc20Balance(
  //     INVESTMENT_ASSET
  //   );

  //   console.log("END BALANCE : ", formatEther(endBalance));

  // let totalInvest = _.reduce(
  //   _result,
  //   function (acc, value, key) {
  //     return acc.add(value.invest);
  //   },
  //   BigNumber.from("0")
  // );

  // let totalProfit = _.reduce(
  //   _result,
  //   function (acc, value, key) {
  //     return acc.add(value.profit);
  //   },
  //   BigNumber.from("0")
  // );

  // let totalGas = _.reduce(
  //   _result,
  //   function (acc, value, key) {
  //     return acc.add(value.gas);
  //   },
  //   BigNumber.from("0")
  // );

  // console.log("Total Investmnet : ", totalInvest);
  // console.log("Total Investmnet : ", totalProfit);
  // console.log("Total Gas Spent: ", formatUnits(totalGas, "gwei"));
  // console.log(
  //   "TotalInvest - TotalProfit : ",
  //   formatEther(totalInvest.sub(totalProfit))
  // );
  // let { _balance: endBalance } = await contract.getContractErc20Balance(
  //   "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
  // );
  // console.log("START BALANCE : ", formatEther(endBalance));
}

async function esitmateGas(
  contract: Arb,
  txData: TXDATA
): Promise<{ gas: BigNumber }> {
  let gasEstimation = null;
  gasEstimation = await contract.estimateGas.startArbitrage(
    txData._token1,
    txData._token2,
    txData._router2,
    txData._router1,
    txData._investAmount,
    gasParams
    // {
    //   maxFeePerGas: maxFeePerGas,
    //   maxPriorityFeePerGas: maxPriorityFeePerGas,
    // }
  );
  return { gas: parseUnits(gasEstimation.toString(), "gwei") };
}

/**
 * Simulate Transaction and gas costs
 * @param contract
 * @param txData
 */
async function simulateTransaction(
  contract: Arb,
  txData: TXDATA
): Promise<SIMULATION> {
  // let gasEstimation;
  try {
    // gasEstimation = await contract.estimateGas.startArbitrage(
    //   txData._token1,
    //   txData._token2,
    //   txData._router2,
    //   txData._router1,
    //   txData._investAmount,
    //   gasParams
    //   // {
    //   //   maxFeePerGas: maxFeePerGas,
    //   //   maxPriorityFeePerGas: maxPriorityFeePerGas,
    //   // }
    // );

    let profit = await contract.callStatic.startArbitrage(
      txData._token1,
      txData._token2,
      txData._router2,
      txData._router1,
      txData._investAmount,
      // gasParams
      {
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
      }
    );

    return {
      success: true,
      invest: txData._investAmount,
      profit: profit,
      // gas: parseUnits(gasEstimation.toString(), "gwei"), // Normalize gasestimation result gwei to wei (nAVAX 10^9 to Wei 10^18)
      token1: txData._token1,
      token2: txData._router2,
      router1: txData._router1,
      router2: txData._router2,
      investAmount: txData._investAmount,
    };
  } catch (exeption: any) {
    // console.log(txData);
    if (exeption.error) {
      console.log(exeption.error.message);
    }
    // console.log("gasEstimation : ", gasEstimation?.toString());
    console.log("----------------------------------");
    return {
      success: false,
      invest: BigNumber.from("0"),
      profit: BigNumber.from("0"),
      // gas: BigNumber.from("0"),
    };
  }
}

/**
 * Fetch Arbitrage Data from the service
 * @returns IARBITEM[]
 */
async function fetchArbitrageData(): Promise<IARBITEM[]> {
  console.log("Start Fetchin New Arbs ... ");
  const { data } = await axios.get(ARB_ENDPOINT);
  const arbData: IARBITEM[] = data;
  // Filter Data by WAWAX
  const _filetr1 = _.filter(arbData, {
    ProfitCurrency: INVESTMENT_ASSET, // WAVAX
  });
  console.log("TOTAL AMOUNT: ", _filetr1.length);
  // console.log(_filetr1);
  const _filter2 = _.filter(_filetr1, function (o) {
    return o.Profit > 0.001;
  });
  console.log("FILTERED BY 0.001 : ", _filter2.length);

  // console.log(_filter2);
  return _filter2;
}

/**
 * Extract nessesary data fro Smartcontract call
 * @param arbData
 * @returns
 */
function extractTransactionData(arbData: IARBITEM): TXDATA {
  const {
    swapFrom: _token1,
    swapTo: _token2,
    nameFrom: _token1_name,
    nameTo: _token2_name,
  } = arbData.Path[0];

  const _router1 = arbData.Path[0].router;
  const _router2 = arbData.Path[1].router;

  // Investment is only WAVAX decimals = 18
  // const _investAmount = parseUnits(
  //   arbData.Path[0].swapAmountFrom.toFixed(),
  //   18
  // );

  const _investAmount = parseEther(arbData.Path[0].swapAmountFrom.toFixed(18));
  // console.log("_investAmount:  ", _investAmount);

  return {
    _token1,
    _token2,
    _router1,
    _router2,
    _investAmount,
    _token1_name,
    _token2_name,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
