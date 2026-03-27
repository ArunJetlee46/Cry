const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying CrowdFunding with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const CrowdFunding = await ethers.getContractFactory("CrowdFunding");
  const crowdFunding = await CrowdFunding.deploy();
  await crowdFunding.waitForDeployment();

  const address = await crowdFunding.getAddress();
  console.log("CrowdFunding deployed to:", address);
  console.log(
    "View on Etherscan: https://sepolia.etherscan.io/address/" + address
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
