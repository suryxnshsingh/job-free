import hre from "hardhat";

async function main() {
  console.log("💰 Funding test account with ETH...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Test account address (this would be a user's MetaMask account in practice)
  const TEST_ACCOUNT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat test account #1
  
  console.log("Target account:", TEST_ACCOUNT);
  console.log("Target balance before:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(TEST_ACCOUNT)), "ETH");
  
  // Send 10 ETH to test account
  const tx = await deployer.sendTransaction({
    to: TEST_ACCOUNT,
    value: hre.ethers.parseEther("10.0")
  });
  
  console.log("⏳ Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ ETH sent successfully!");
  
  console.log("Target balance after:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(TEST_ACCOUNT)), "ETH");
  
  console.log("\n📋 Test account details:");
  console.log("Address:", TEST_ACCOUNT);
  console.log("Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("\n💡 Import this account in MetaMask to test bidding functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });