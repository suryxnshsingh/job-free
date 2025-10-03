const { ethers } = require("hardhat");

async function createJobDirect() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    
    const userAddress = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
    
    console.log("Creating job for:", userAddress);
    
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [userAddress],
    });
    
    const signer = await ethers.getSigner(userAddress);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = currentTime + (7 * 24 * 60 * 60); // 7 days from now
    
    console.log("Job parameters:");
    console.log("- Title: Simple Test Job");
    console.log("- Budget: 0.1 ETH");
    console.log("- Deadline:", new Date(deadline * 1000));
    
    try {
        const tx = await freelanceJob.connect(signer).createJob(
            "Simple Test Job",
            "This is a working test job created directly via script",
            "development",
            ethers.parseEther("0.1"), // 0.1 ETH
            "0x0000000000000000000000000000000000000000", // ETH payment
            deadline,
            "QmTestJobMetadata123",
            [1, 2], // skill IDs
            [3, 4]  // skill levels
        );
        
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Job created successfully\!");
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        
    } catch (error) {
        console.error("❌ Job creation failed:", error.message);
    }
    
    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [userAddress],
    });
}

createJobDirect().catch(console.error);