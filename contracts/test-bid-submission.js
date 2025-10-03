import hre from "hardhat";

async function main() {
  console.log("🚀 Testing bid submission...");
  
  // Get test account (account #1 from Hardhat)
  const accounts = await hre.ethers.getSigners();
  const freelancer = accounts[1]; // Different from deployer
  
  console.log("Freelancer account:", freelancer.address);
  console.log("Freelancer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(freelancer.address)), "ETH");
  
  // Contract addresses from deployment
  const FREELANCE_JOB_ADDRESS = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";
  const USER_REGISTRY_ADDRESS = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  
  // Get contract instances
  const UserRegistry = await hre.ethers.getContractAt("UserRegistry", USER_REGISTRY_ADDRESS);
  const FreelanceJob = await hre.ethers.getContractAt("FreelanceJob", FREELANCE_JOB_ADDRESS);
  
  // Connect contracts to freelancer account
  const userRegistryAsFreelancer = UserRegistry.connect(freelancer);
  const freelanceJobAsFreelancer = FreelanceJob.connect(freelancer);
  
  // Register freelancer if not already registered
  try {
    console.log("📝 Registering freelancer...");
    const tx = await userRegistryAsFreelancer.registerUser(1, "QmFreelancerProfile"); // UserType.Freelancer = 1
    await tx.wait();
    console.log("✅ Freelancer registered");
  } catch (error) {
    console.log("📋 Freelancer already registered or registration failed:", error.message);
  }
  
  // Submit a bid for job #1
  const jobId = 1;
  const bidAmount = hre.ethers.parseEther("2.0"); // 2 ETH
  const stakeAmount = hre.ethers.parseEther("50.0"); // 50 FDAO stake (minimum)
  const deliveryTime = 14; // 14 days
  const proposalHash = "QmTestProposal123";
  const portfolioHash = "QmTestPortfolio456";
  
  console.log("📄 Submitting bid for job:", jobId);
  console.log("💰 Bid amount:", hre.ethers.formatEther(bidAmount), "ETH");
  console.log("🔒 Stake amount:", hre.ethers.formatEther(stakeAmount), "FDAO tokens");
  
  try {
    const tx = await freelanceJobAsFreelancer.submitBid(
      jobId,
      bidAmount,
      deliveryTime,
      proposalHash,
      portfolioHash,
      stakeAmount
      // No value needed - stake is handled via token transfer
    );
    
    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Bid submitted successfully!");
    
    // Check bid details
    const bids = await FreelanceJob.getJobBids(jobId);
    console.log("📋 Bids for job:", bids.length);
    
    if (bids.length > 0) {
      const lastBid = bids[bids.length - 1];
      console.log("📊 Latest bid details:", {
        freelancer: lastBid.freelancer,
        amount: hre.ethers.formatEther(lastBid.amount),
        stakeAmount: hre.ethers.formatEther(lastBid.stakeAmount),
        deliveryTime: lastBid.deliveryTime.toString(),
        status: lastBid.status.toString()
      });
    }
    
  } catch (error) {
    console.error("❌ Error submitting bid:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
  
  console.log("Freelancer balance after:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(freelancer.address)), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });