import hre from "hardhat";

async function main() {
  console.log("🚀 Creating multiple test jobs...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Contract addresses from deployment
  const FREELANCE_JOB_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  
  // Get contract instance
  const FreelanceJob = await hre.ethers.getContractAt("FreelanceJob", FREELANCE_JOB_ADDRESS);
  
  const testJobs = [
    {
      title: "Smart Contract Security Audit",
      description: "Need comprehensive security audit for DeFi protocol smart contracts. Looking for experienced auditor with expertise in Solidity, flash loan attacks, and formal verification.",
      category: "Security Audit",
      budget: "2.5", // ETH
    },
    {
      title: "NFT Marketplace Frontend Development",
      description: "Build modern, responsive frontend for NFT marketplace using React, Next.js, and Web3 integration. Must have experience with MetaMask, IPFS, and OpenSea-style UX.",
      category: "Frontend Development", 
      budget: "3.0", // ETH
    },
    {
      title: "DeFi Yield Farming Protocol",
      description: "Develop yield farming smart contracts with staking, liquidity mining, and governance features. Need deep understanding of DeFi protocols and tokenomics.",
      category: "DeFi Development",
      budget: "8.0", // ETH
    },
    {
      title: "Cross-Chain Bridge Implementation",
      description: "Build secure cross-chain bridge for asset transfers between Ethereum and Polygon. Requires expertise in multi-sig wallets, oracle integration, and bridge security.",
      category: "Cross-Chain",
      budget: "6.5", // ETH
    }
  ];
  
  for (let i = 0; i < testJobs.length; i++) {
    const job = testJobs[i];
    console.log(`\n📄 Creating job ${i + 2}: ${job.title}...`);
    
    const tx = await FreelanceJob.createJob(
      job.title,
      job.description,
      job.category,
      hre.ethers.parseEther(job.budget),
      "0x0000000000000000000000000000000000000000", // ETH
      Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      `QmJobMetadata${i + 2}`,
      [1, 2, 3], // Skill IDs
      [5, 4, 5]  // Skill levels
    );
    
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Job ${i + 2} created successfully!`);
  }
  
  // Check total jobs
  const totalJobs = await FreelanceJob.totalJobs();
  console.log(`\n📊 Total jobs created: ${totalJobs.toString()}`);
  
  console.log("\n🎉 All test jobs created! Now you can test the browse page.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });