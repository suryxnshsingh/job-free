import hre from "hardhat";

async function main() {
  console.log("💰 Setting up freelancer with tokens...");
  
  const [deployer] = await hre.ethers.getSigners();
  const freelancer = await hre.ethers.getSigner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  
  console.log("Deployer:", deployer.address);
  console.log("Freelancer:", freelancer.address);
  
  // Contract addresses
  const GOVERNANCE_TOKEN_ADDRESS = "0x68B1D87F95878fE05B998F19b66F4baba5De1aed";
  const FREELANCE_JOB_ADDRESS = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";
  
  // Get contract instances
  const GovernanceToken = await hre.ethers.getContractAt("GovernanceToken", GOVERNANCE_TOKEN_ADDRESS);
  
  // Check deployer's token balance
  const deployerBalance = await GovernanceToken.balanceOf(deployer.address);
  console.log("Deployer token balance:", hre.ethers.formatEther(deployerBalance), "FDAO");
  
  // Transfer tokens to freelancer
  const transferAmount = hre.ethers.parseEther("1000"); // 1000 FDAO
  console.log("📤 Transferring", hre.ethers.formatEther(transferAmount), "FDAO to freelancer...");
  
  const transferTx = await GovernanceToken.transfer(freelancer.address, transferAmount);
  await transferTx.wait();
  console.log("✅ Tokens transferred!");
  
  // Check freelancer's token balance
  const freelancerBalance = await GovernanceToken.balanceOf(freelancer.address);
  console.log("Freelancer token balance:", hre.ethers.formatEther(freelancerBalance), "FDAO");
  
  // Approve FreelanceJob contract to spend tokens
  console.log("📝 Approving FreelanceJob contract to spend tokens...");
  const freelancerToken = GovernanceToken.connect(freelancer);
  const approveAmount = hre.ethers.parseEther("500"); // Approve 500 FDAO for staking
  
  const approveTx = await freelancerToken.approve(FREELANCE_JOB_ADDRESS, approveAmount);
  await approveTx.wait();
  console.log("✅ Approval set!");
  
  // Check allowance
  const allowance = await GovernanceToken.allowance(freelancer.address, FREELANCE_JOB_ADDRESS);
  console.log("Allowance:", hre.ethers.formatEther(allowance), "FDAO");

  // Stake tokens in UserRegistry to meet staking requirement
  const USER_REGISTRY_ADDRESS = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  const UserRegistry = await hre.ethers.getContractAt("UserRegistry", USER_REGISTRY_ADDRESS);
  const userRegistryAsFreelancer = UserRegistry.connect(freelancer);
  
  console.log("🔒 Staking tokens in UserRegistry to meet staking requirement...");
  const stakeInRegistryAmount = hre.ethers.parseEther("100"); // Minimum stake
  
  // Approve UserRegistry to spend tokens
  const approveRegistryTx = await freelancerToken.approve(USER_REGISTRY_ADDRESS, stakeInRegistryAmount);
  await approveRegistryTx.wait();
  
  // Stake tokens
  const stakeTx = await userRegistryAsFreelancer.stakeTokens(stakeInRegistryAmount);
  await stakeTx.wait();
  console.log("✅ Tokens staked in UserRegistry!");
  
  // Check if meets staking requirement
  const meetsReq = await UserRegistry.meetsStakingRequirement(freelancer.address);
  console.log("Meets staking requirement:", meetsReq);
  
  console.log("\n🎉 Freelancer is ready to submit bids!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });