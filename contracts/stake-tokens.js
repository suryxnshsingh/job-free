import hre from "hardhat";

async function main() {
  console.log("🔒 Staking tokens in UserRegistry...");
  
  const targetWallet = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
  console.log("For wallet:", targetWallet);
  
  // Contract addresses
  const GOVERNANCE_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USER_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  // Get contract instances
  const GovernanceToken = await hre.ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);
  const UserRegistry = await hre.ethers.getContractAt("UserRegistry", USER_REGISTRY_ADDRESS);
  
  // First, send the tokens to the target wallet if they don't have enough
  const balance = await GovernanceToken.balanceOf(targetWallet);
  console.log("Current FDAO balance:", hre.ethers.formatEther(balance));
  
  // We need to impersonate the target wallet to stake on their behalf
  // For testing, we'll send 200 more tokens first, then use deployer to stake them
  const [deployer] = await hre.ethers.getSigners();
  
  // Transfer more tokens if needed
  if (hre.ethers.formatEther(balance) < 200) {
    console.log("Transferring more tokens...");
    const transferTx = await GovernanceToken.transfer(targetWallet, hre.ethers.parseEther("200"));
    await transferTx.wait();
    console.log("✅ Transferred additional tokens");
  }
  
  // For Hardhat testing, we can impersonate the user
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [targetWallet],
  });
  
  const userSigner = await hre.ethers.getSigner(targetWallet);
  
  // Check if user is registered
  const userData = await UserRegistry.users(targetWallet);
  if (userData[0] === "0x0000000000000000000000000000000000000000") {
    console.log("📝 Registering user first...");
    const registerTx = await UserRegistry.connect(userSigner).registerUser(1, "QmFreelancerProfile"); // 1 = Freelancer
    await registerTx.wait();
    console.log("✅ User registered");
  }
  
  // Approve UserRegistry to spend tokens
  const stakeAmount = hre.ethers.parseEther("150"); // Stake 150 tokens (more than minimum 100)
  console.log("🔗 Approving tokens for staking...");
  const approveTx = await GovernanceToken.connect(userSigner).approve(USER_REGISTRY_ADDRESS, stakeAmount);
  await approveTx.wait();
  console.log("✅ Approval completed");
  
  // Stake tokens
  console.log("🔒 Staking 150 FDAO tokens...");
  const stakeTx = await UserRegistry.connect(userSigner).stakeTokens(stakeAmount);
  await stakeTx.wait();
  console.log("✅ Tokens staked successfully");
  
  // Check if user meets staking requirement
  const meetsRequirement = await UserRegistry.meetsStakingRequirement(targetWallet);
  console.log("📊 Meets staking requirement:", meetsRequirement);
  
  // Check final balances
  const finalBalance = await GovernanceToken.balanceOf(targetWallet);
  const userInfo = await UserRegistry.users(targetWallet);
  console.log("📈 Final FDAO balance:", hre.ethers.formatEther(finalBalance));
  console.log("🔒 Staked amount:", hre.ethers.formatEther(userInfo[6])); // stakedAmount is at index 6
  
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [targetWallet],
  });
  
  console.log("✅ Staking completed! User can now submit bids.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });