import hre, { ethers } from "hardhat";
import { expect, assert } from "chai";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { utils, providers } from "ethers";
import { Arb__factory, Arb } from "../typechain";
import axios from "axios";
import _ from "lodash";
import { IARBITEM } from "./types";

const gasParams = {
  gasLimit: "4000000",
  gasPrice: parseUnits("30", "gwei"),
};

describe.only("ARBITRAGE TEST", function () {
  it("Should Execute Succesfull Arbitrage", async function () {
    const [deployer, userA, userB, userC] = await ethers.getSigners();

    console.log("Block Number : ", await ethers.provider.getBlockNumber());
    console.log("Deployer address: ", deployer.address);

    // const { data } = await axios.get("http://95.216.43.90:8080/arb");
    // const arbData: IARBITEM[] = data;
    // const filteredByProfitCurrency = _.filter(arbData, {
    //   ProfitCurrency: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    //   // ProfitCurrency:
    // });

    const arbContract = await new Arb__factory(deployer).deploy();
    await arbContract.deployed();

    console.log("CONTRACT_ADDRESS: ", arbContract.address);
    console.log("Fund WAVAX the contract account");

    const txData = {
      from: deployer.address,
      to: arbContract.address,
      value: ethers.utils.parseEther("900"),
      ...gasParams,
    };

    let tx = await deployer.sendTransaction(txData);
    await tx.wait();

    await arbContract.wrapAwax(ethers.utils.parseEther("1"));

    console.log(`Start Arbitrage ... `);

    const arbData = {
      Profit: 0.001013202211439579,
      ProfitCurrency: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      ProfitCurrencyName: "WAVAX",
      token1Decimals: 0,
      token2Decimals: 18,
      Path: [
        {
          poolAddress: "0x7cE2F6a335C7ac4025F9e88000030627000a6440",
          swapFrom: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
          swapAmountFrom: 0.018405676087020095,
          nameFrom: "WAVAX",
          swapTo: "0x74A68215AEdf59f317a23E87C13B848a292F27A4",
          nameTo: "XPOW",
          router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
        },
        {
          poolAddress: "0xE63982a33e2f104C26a4D3993FB17E96A2383A83",
          swapFrom: "0x74A68215AEdf59f317a23E87C13B848a292F27A4",
          nameFrom: "XPOW",
          swapTo: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
          swapAmountTo: 0.019418878298459674,
          nameTo: "WAVAX",
          router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
        },
      ],
    };

    const {
      swapFrom: _token1,
      swapTo: _token2,
      router: _router1,
    } = arbData.Path[0];

    const _router2 = arbData.Path[1].router;
    const decimals = arbData.token1Decimals;

    // Investment is only WAVAX so I decided hardcode  decimas 18
    const _investAmount = parseUnits(
      (arbData.Path[0].swapAmountFrom as number).toString(),
      18
    );

    console.log(` 
      _token1: ${_token1}
      _token2: ${_token2}
      _router1: ${_router1}
      _router2: ${_router2}
      _investAmount: ${_investAmount}
    `);

    let res = await arbContract.callStatic.startArbitrage(
      _token1,
      _token2,
      _router1,
      _router2,
      _investAmount
    );

    const result = res.sub(_investAmount);

    console.log("RESULT : ", result, formatUnits(result, 18));
    console.log("------------------------------");

    assert(true);
  });
});
