import hre from "hardhat";

async function main() {
  console.log("💰 Airdropping ETH to wallet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("From account:", deployer.address);
  
  const targetWallet = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
  console.log("To wallet:", targetWallet);
  
  // Check initial balance
  const initialBalance = await hre.ethers.provider.getBalance(targetWallet);
  console.log("Initial balance:", hre.ethers.formatEther(initialBalance), "ETH");
  
  // Send 10 ETH
  const tx = await deployer.sendTransaction({
    to: targetWallet,
    value: hre.ethers.parseEther("10.0")
  });
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  
  // Check final balance
  const finalBalance = await hre.ethers.provider.getBalance(targetWallet);
  console.log("Final balance:", hre.ethers.formatEther(finalBalance), "ETH");
  
  console.log("✅ Airdrop completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });