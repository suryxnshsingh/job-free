const { ethers } = require("hardhat");

async function createJob() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    const signer = await ethers.getSigner("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
    
    console.log("Creating job...");
    
    const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
    const tx = await freelanceJob.connect(signer).createJob(
        "Web3 Development Project",
        "Need a skilled developer to build a DeFi application",
        "development", 
        ethers.parseEther("1.0"), // 1 ETH budget
        "0x0000000000000000000000000000000000000000", // ETH payment
        deadline,
        "QmTestJobMetadata123", // IPFS hash
        [1, 2], // skill IDs
        [3, 4]  // skill levels
    );
    
    await tx.wait();
    console.log("Job created successfully:", tx.hash);
}

createJob().catch(console.error);