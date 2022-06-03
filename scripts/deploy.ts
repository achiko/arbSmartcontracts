import { ethers } from "hardhat";
import { formatUnits, parseUnits } from "ethers/lib/utils";

const gasParams = {
  gasLimit: "4000000",
  gasPrice: parseUnits("26", "gwei"),
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer : ", deployer.address);
  const Arbitrage = await ethers.getContractFactory("Arb");
  const arbitrageContract = await Arbitrage.deploy();
  await arbitrageContract.deployed();
  console.log("Arbitrage Contract Deployed : ", arbitrageContract.address);

  // console.log("Fund WAVAX the contract account");
  // const txData = {
  //   from: deployer.address,
  //   to: arbitrageContract.address,
  //   value: ethers.utils.parseEther("1"),
  //   ...gasParams,
  // };
  // let tx = await deployer.sendTransaction(txData);
  // await tx.wait();

  // await arbitrageContract.wrapAwax(ethers.utils.parseEther("1"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
