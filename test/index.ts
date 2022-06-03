import hre, { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect, assert } from "chai";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { utils, providers } from "ethers";

import { ArbAave__factory, ArbAave } from "../typechain";

const gasParams = {
  gasLimit: "4000000",
  gasPrice: parseUnits("100", "gwei"),
};

describe("UNISWAP TEST", function () {
  it("Should swap between pairs", async function () {
    const [deployer, userA, userB, userC] = await ethers.getSigners();
    console.log("Block Number : ", await ethers.provider.getBlockNumber());

    const LENDING_POOL_ADDRESS_PROVIDER =
      process.env.LENDING_POOL_ADDRESS_PROVIDER || "";
    const arb = await new ArbAave__factory(deployer).deploy(
      LENDING_POOL_ADDRESS_PROVIDER
    );
    await arb.deployed();

    console.log("CONTRACT_ADDRESS: ", arb.address);

    const ROUTER_TRADERJOE = process.env.ROUTER_TRADERJOE || "";
    const ROUTER_PANGOLIN = process.env.ROUTER_PANGOLIN || "";

    const data = {
      Path: [
        "0x87Dee1cC9FFd464B79e058ba20387c1984aed86a",
        "0xbA09679Ab223C6bdaf44D45Ba2d7279959289AB0",
      ],
      Trade: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
      Amount: 3973.0252429161146,
      Profit: 127.60624967965578,
    };

    await arb.flashloanCall(
      data.Trade,
      data.Path[0],
      data.Path[1],
      ROUTER_TRADERJOE,
      ROUTER_PANGOLIN,
      parseUnits(data.Amount.toString(), 18),
      gasParams
    );

    assert(true);
  });
});
