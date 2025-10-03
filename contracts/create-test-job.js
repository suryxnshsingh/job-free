import hre from "hardhat";

async function main() {
  console.log("🚀 Creating test job...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Contract addresses from deployment
  const FREELANCE_JOB_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const USER_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const GOVERNANCE_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Get contract instances
  const UserRegistry = await hre.ethers.getContractAt("UserRegistry", USER_REGISTRY_ADDRESS);
  const FreelanceJob = await hre.ethers.getContractAt("FreelanceJob", FREELANCE_JOB_ADDRESS);
  
  // Register user as client if not already registered
  try {
    console.log("📝 Registering user as client...");
    const tx = await UserRegistry.registerUser(0, "QmClientProfile"); // UserType.Client = 0
    await tx.wait();
    console.log("✅ User registered as client");
  } catch (error) {
    console.log("📋 User already registered or registration failed:", error.message);
  }
  
  // Create a test job
  console.log("📄 Creating test job...");
  const jobParams = {
    title: "Build Decentralized E-commerce Platform",
    description: "We need an experienced blockchain developer to build a full-stack decentralized e-commerce platform with smart contract integration, payment processing, and NFT marketplace features.",
    category: "Blockchain Development",
    budget: hre.ethers.parseEther("5.0"), // 5 ETH
    paymentToken: "0x0000000000000000000000000000000000000000", // ETH
    deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
    metadataHash: "QmTestJobMetadata123",
    skillIds: [1, 2, 3], // Blockchain, Smart Contracts, Web3
    skillLevels: [5, 5, 4] // Expert level
  };
  
  const tx = await FreelanceJob.createJob(
    jobParams.title,
    jobParams.description,
    jobParams.category,
    jobParams.budget,
    jobParams.paymentToken,
    jobParams.deadline,
    jobParams.metadataHash,
    jobParams.skillIds,
    jobParams.skillLevels
  );
  
  console.log("⏳ Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Job created successfully!");
  
  // Get job ID from events
  const jobCreatedEvent = receipt.logs.find(log => {
    try {
      const decoded = FreelanceJob.interface.parseLog(log);
      return decoded?.name === 'JobCreated';
    } catch {
      return false;
    }
  });
  
  if (jobCreatedEvent) {
    const decoded = FreelanceJob.interface.parseLog(jobCreatedEvent);
    const jobId = decoded.args[0];
    console.log("🆔 Job ID:", jobId.toString());
    
    // Verify job details
    const job = await FreelanceJob.jobs(jobId);
    console.log("📋 Job details:", {
      id: jobId.toString(),
      client: job[1],
      title: job[3],
      description: job[4],
      budget: hre.ethers.formatEther(job[6]),
      status: job[9].toString()
    });
  }
  
  // Check total jobs
  const totalJobs = await FreelanceJob.totalJobs();
  console.log("📊 Total jobs:", totalJobs.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });