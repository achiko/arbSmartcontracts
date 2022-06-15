import hre, { ethers } from "hardhat";
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from "ethers/lib/utils";
import { Arb__factory, Arb } from "../typechain";
import { BigNumber, FixedNumber, providers } from "ethers";
import { getMaxListeners } from "process";

const OLD_ARB_CONTRACT_ADDRESS = "0x54db0E6bb95D5C188E2D96d971B871Cb75A862E0";
const NEW_ARB_CONTRACT_ADDRESS = "0xe7bec638c696b851f2ada55add5ddc97ea935103";
const INVESTMENT_ASSET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("BLOCK NUMBER: ", await ethers.provider.getBlockNumber());
  const contract = Arb__factory.connect(OLD_ARB_CONTRACT_ADDRESS, deployer);

  await contract.transferAllErc20Tokens(
    INVESTMENT_ASSET,
    NEW_ARB_CONTRACT_ADDRESS
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
