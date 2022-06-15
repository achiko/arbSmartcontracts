import hre, { ethers } from "hardhat";
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from "ethers/lib/utils";
import { Arb__factory, Arb } from "../typechain";
import axios from "axios";
import _ from "lodash";
import { IARBITEM } from "../test/types";
import { BigNumber, FixedNumber, providers } from "ethers";
import { getMaxListeners } from "process";

const ARB_CONTRACT_ADDRESS = "0xe7bec638c696b851f2ada55add5ddc97ea935103";
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
  gasPrice: parseUnits("50", "gwei"),
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
  maxPriorityFeePerGas = feeData?.maxPriorityFeePerGas!;

  console.log(
    `maxFeePerGas: ${maxFeePerGas}   maxPriorityFeePerGas: ${maxPriorityFeePerGas} `
  );

  let { _balance: startBalance } = await contract.getContractErc20Balance(
    INVESTMENT_ASSET
  );
  console.log("START BALANCE : ", formatEther(startBalance));
  let _consolaTable = [];

  let totalInvest = BigNumber.from("0");

  for (let _arbItem of data) {
    let txData = extractTransactionData(_arbItem);
    let simulateResult = await simulateTransaction(contract, txData);

    if (simulateResult.success) {
      let { invest, profit, token1, token2 } = simulateResult;
      let { gasFee } = await esitmateGas(contract, txData);

      if (profit.sub(invest).sub(gasFee).gt(0)) {
        console.log("Start Transaction !!! ");

        const nonce = await deployer.getTransactionCount();
        console.log("Nonce : ", nonce);

        let tx = await contract.startArbitrage(
          txData._token1,
          txData._token2,
          txData._router1,
          txData._router2,
          txData._investAmount,
          {
            gasLimit: 300000,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            nonce: nonce,
          }
        );
        // console.log(
        //   "Total Investment : ",
        //   txData._investAmount,
        //   formatEther(totalInvest),
        //   "Is balance ok : ",
        //   startBalance.gt(totalInvest)
        // );
        console.log("tx Hash : ", tx.hash);

        _consolaTable.push({
          Investment: parseFloat(formatUnits(invest, 18)),
          Profit: parseFloat(formatUnits(profit, 18)),
          GasFee: parseFloat(formatUnits(gasFee, 18)),
          "Profitable?(With Gas)": profit.sub(invest).sub(gasFee).gt(0),
          "Profitable?(Without Gas)": profit.sub(invest).gt(0),
          token1_name: txData._token1_name,
          token2_name: txData._token2_name,
        });
      }
    }
  }

  console.table(_consolaTable);

  let { _balance: endBalance } = await contract.getContractErc20Balance(
    INVESTMENT_ASSET
  );
  console.log("END BALANCE : ", formatEther(endBalance));
}

async function esitmateGas(
  contract: Arb,
  txData: TXDATA
): Promise<{ gasFee: BigNumber }> {
  let gasEstimation = null;
  gasEstimation = await contract.estimateGas.startArbitrage(
    txData._token1,
    txData._token2,
    txData._router1,
    txData._router2,
    txData._investAmount,
    {
      gasLimit: 300000,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
    }
  );
  return { gasFee: gasEstimation };
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
    let profit = await contract.callStatic.startArbitrage(
      txData._token1,
      txData._token2,
      txData._router1,
      txData._router2,
      txData._investAmount,
      // gasParams
      {
        gasLimit: 300000,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
      }
    );

    return {
      success: true,
      invest: txData._investAmount,
      profit: profit,
      token1: txData._token1,
      token2: txData._router2,
      router1: txData._router1,
      router2: txData._router2,
      investAmount: txData._investAmount,
    };
  } catch (exeption: any) {
    // console.log(exeption.error);
    return {
      success: false,
      invest: BigNumber.from("0"),
      profit: BigNumber.from("0"),
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
  const _investAmount = parseEther(arbData.Path[0].swapAmountFrom.toFixed(18));

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
