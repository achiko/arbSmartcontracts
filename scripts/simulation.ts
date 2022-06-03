import hre, { ethers } from "hardhat";
import { formatEther, formatUnits, parseUnits } from "ethers/lib/utils";
import { Arb__factory, Arb } from "../typechain";
import axios from "axios";
import _ from "lodash";
import { IARBITEM } from "../test/types";
import { BigNumber, FixedNumber } from "ethers";

const gasParams = {
  gasLimit: "4000000",
  gasPrice: parseUnits("27", "gwei"),
};

const ARB_CONTRACT_ADDRESS = "0xca2C22Dd7Cbfbe5b197Ad68924bC386aD58AAd95";
const ARB_ENDPOINT = "http://176.9.3.155:8080/arb1";

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
  gas: BigNumber;
  token1?: string;
  token2?: string;
  router1?: string;
  router2?: string;
  investAmount?: BigNumber;
  token1_name?: string;
  token2_name?: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("BLOCK NUMBER: ", await ethers.provider.getBlockNumber());
  const contract = Arb__factory.connect(ARB_CONTRACT_ADDRESS, deployer);
  const data = await fetchArbitrageData();

  let { _balance: startBalance } = await contract.getContractErc20Balance(
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
  );
  console.log("START BALANCE : ", formatEther(startBalance));

  let _consolaTable = [];

  for (let _arbItem of data) {
    let txData = extractTransactionData(_arbItem);
    let simulationResult = await simulateTransaction(contract, txData);

    if (simulationResult.success) {
      let {
        invest,
        profit,
        gas,
        token1,
        token2,
        router1,
        router2,
        investAmount,
      } = simulationResult;

      // Final Profit = profit - invest - gas(fee) Must be > 0
      // console.log(
      //   profit.sub(invest).sub(gas),
      //   "is Profitable? ",
      //   profit.sub(invest).sub(gas).gt(0),
      //   "Without Gas ? ",
      //   profit.sub(invest).gt(0)
      // );
      _consolaTable.push({
        Investment: parseFloat(formatUnits(invest, 18)),
        Profit: parseFloat(formatUnits(profit, 18)),
        GasFee: parseFloat(formatUnits(gas, 18)),
        "Profitable?(With Gas)": profit.sub(invest).sub(gas).gt(0),
        "Profitable?(Without Gas)": profit.sub(invest).gt(0),
        // token1: token1,
        token2: token2,
        token1_name: txData._token1_name,
        token2_name: txData._token2_name,
      });
      // console.log("-----------------------");

      if (profit.sub(invest).sub(gas).gt(0)) {
        await contract.startArbitrage(
          txData._token1,
          txData._token2,
          txData._router2,
          txData._router1,
          txData._investAmount,
          gasParams
        );
      }
    }
  }

  console.table(_consolaTable);

  let { _balance: endBalance } = await contract.getContractErc20Balance(
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
  );

  console.log("END BALANCE : ", formatEther(endBalance));

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

/**
 * Simulate Transaction and gas costs
 * @param contract
 * @param txData
 */
async function simulateTransaction(
  contract: Arb,
  txData: TXDATA
): Promise<SIMULATION> {
  try {
    let gasEstimation = await contract.estimateGas.startArbitrage(
      txData._token1,
      txData._token2,
      txData._router2,
      txData._router1,
      txData._investAmount
    );

    let profit = await contract.callStatic.startArbitrage(
      txData._token1,
      txData._token2,
      txData._router2,
      txData._router1,
      txData._investAmount,
      gasParams
    );

    return {
      success: true,
      invest: txData._investAmount,
      profit: profit,
      gas: parseUnits(gasEstimation.toString(), "gwei"), // Normalize gasestimation result gwei to wei (nAVAX 10^9 to Wei 10^18)
      token1: txData._token1,
      token2: txData._router2,
      router1: txData._router1,
      router2: txData._router2,
      investAmount: txData._investAmount,
    };
  } catch (exeption: any) {
    return {
      success: false,
      invest: BigNumber.from("0"),
      profit: BigNumber.from("0"),
      gas: BigNumber.from("0"),
    };
  }
}

/**
 * Fetch Arbitrage Data from the service
 * @returns IARBITEM[]
 */
async function fetchArbitrageData(): Promise<IARBITEM[]> {
  const { data } = await axios.get(ARB_ENDPOINT);
  const arbData: IARBITEM[] = data;
  // Filter Data by WAWAX
  const _filetr1 = _.filter(arbData, {
    ProfitCurrency: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  });
  console.log("TOTAL AMOUNT: ", _filetr1.length);
  // console.log(_filetr1);
  const _filter2 = _.filter(_filetr1, function (o) {
    return o.Profit > 0.001;
  });
  console.log("FILTERED BY 0.01 : ", _filter2.length);

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
    router: _router1,
    nameFrom: _token1_name,
    nameTo: _token2_name,
  } = arbData.Path[0];

  const _router2 = arbData.Path[1].router;

  // Investment is only WAVAX decimals = 18
  const _investAmount = parseUnits(
    arbData.Path[0].swapAmountFrom.toPrecision(10),
    18
  );
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
