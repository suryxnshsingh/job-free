import hre from "hardhat";

async function main() {
  console.log("📋 Listing all available jobs...");
  
  const targetWallet = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
  const FREELANCE_JOB_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  
  const FreelanceJob = await hre.ethers.getContractAt("FreelanceJob", FREELANCE_JOB_ADDRESS);
  
  const totalJobs = await FreelanceJob.totalJobs();
  console.log("Total jobs:", Number(totalJobs));
  
  console.log("\n📊 All Jobs:");
  for (let i = 1; i <= Number(totalJobs); i++) {
    try {
      const job = await FreelanceJob.jobs(i);
      const isYourJob = job[1].toLowerCase() === targetWallet.toLowerCase();
      
      console.log(`\n--- Job ${i} ---`);
      console.log("Client:", job[1]);
      console.log("Title:", job[3]);
      console.log("Budget:", hre.ethers.formatEther(job[6]), "ETH");
      console.log("Status:", job[9].toString(), "(0=Open)");
      console.log("Your job:", isYourJob ? "❌ YES (can't bid)" : "✅ NO (can bid)");
      
      if (!isYourJob && job[9].toString() === "0") {
        console.log("🎯 YOU CAN BID ON THIS JOB!");
      }
    } catch (error) {
      console.log(`❌ Error loading job ${i}:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });