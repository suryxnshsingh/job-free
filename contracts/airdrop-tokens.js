import hre from "hardhat";

async function main() {
  console.log("🪙 Airdropping FDAO tokens to wallet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("From account:", deployer.address);
  
  const targetWallet = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
  console.log("To wallet:", targetWallet);
  
  // Contract addresses
  const GOVERNANCE_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Get contract instance
  const GovernanceToken = await hre.ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);
  
  // Check initial balance
  const initialBalance = await GovernanceToken.balanceOf(targetWallet);
  console.log("Initial FDAO balance:", hre.ethers.formatEther(initialBalance));
  
  // Transfer 1000 FDAO tokens
  const transferAmount = hre.ethers.parseEther("1000");
  console.log("Transferring 1000 FDAO tokens...");
  
  const tx = await GovernanceToken.transfer(targetWallet, transferAmount);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  
  // Check final balance
  const finalBalance = await GovernanceToken.balanceOf(targetWallet);
  console.log("Final FDAO balance:", hre.ethers.formatEther(finalBalance));
  
  console.log("✅ Token airdrop completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });