import hre from "hardhat";

async function main() {
  console.log("🔍 Checking bid status for user...");
  
  const targetWallet = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
  const jobId = 6; // The job they're trying to bid on
  
  console.log("User wallet:", targetWallet);
  console.log("Job ID:", jobId);
  
  // Contract addresses
  const FREELANCE_JOB_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const USER_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  // Get contract instances
  const FreelanceJob = await hre.ethers.getContractAt("FreelanceJob", FREELANCE_JOB_ADDRESS);
  const UserRegistry = await hre.ethers.getContractAt("UserRegistry", USER_REGISTRY_ADDRESS);
  
  // Check job details
  console.log("\n📋 Job Details:");
  try {
    const job = await FreelanceJob.jobs(jobId);
    console.log("- Job ID:", jobId);
    console.log("- Client:", job[1]);
    console.log("- Title:", job[3]);
    console.log("- Status:", job[9].toString(), "(0=Open, 1=Assigned, etc.)");
    console.log("- Deadline:", new Date(Number(job[8]) * 1000).toLocaleString());
    console.log("- Current time:", new Date().toLocaleString());
    console.log("- Is past deadline:", Date.now() > Number(job[8]) * 1000);
  } catch (error) {
    console.log("❌ Error getting job details:", error.message);
  }
  
  // Check if user already has a bid
  console.log("\n🎯 Bid Status:");
  try {
    const hasBid = await FreelanceJob.hasBid(jobId, targetWallet);
    console.log("- User already has bid:", hasBid);
    
    if (hasBid) {
      console.log("❌ USER ALREADY HAS A BID ON THIS JOB!");
      
      // Get user's bids
      const bids = await FreelanceJob.getJobBids(jobId);
      console.log("- Total bids on job:", bids.length);
      
      for (let i = 0; i < bids.length; i++) {
        if (bids[i].freelancer.toLowerCase() === targetWallet.toLowerCase()) {
          console.log("- User's bid details:", {
            amount: hre.ethers.formatEther(bids[i].amount),
            stakedAmount: hre.ethers.formatEther(bids[i].stakedAmount),
            status: bids[i].status.toString()
          });
        }
      }
    }
  } catch (error) {
    console.log("❌ Error checking bid status:", error.message);
  }
  
  // Check user registration and staking
  console.log("\n👤 User Status:");
  try {
    const userData = await UserRegistry.users(targetWallet);
    console.log("- Is registered:", userData[0] !== "0x0000000000000000000000000000000000000000");
    console.log("- User type:", userData[2].toString(), "(0=Client, 1=Freelancer, 2=Both)");
    console.log("- Staked amount:", hre.ethers.formatEther(userData[6]));
    
    const meetsRequirement = await UserRegistry.meetsStakingRequirement(targetWallet);
    console.log("- Meets staking requirement:", meetsRequirement);
  } catch (error) {
    console.log("❌ Error checking user status:", error.message);
  }
  
  // Check if user is the client of this job
  console.log("\n⚠️  Additional Checks:");
  try {
    const job = await FreelanceJob.jobs(jobId);
    const isClient = job[1].toLowerCase() === targetWallet.toLowerCase();
    console.log("- User is the client:", isClient);
    if (isClient) {
      console.log("❌ CLIENTS CANNOT BID ON THEIR OWN JOBS!");
    }
  } catch (error) {
    console.log("❌ Error checking client status:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });