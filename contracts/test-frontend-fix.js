const { ethers } = require("hardhat");

async function testFrontendFix() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    const userAddress = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
    
    console.log("🧪 Testing frontend-style job creation...");
    
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [userAddress],
    });
    
    const signer = await ethers.getSigner(userAddress);
    
    try {
        // Simulate exactly what the frontend will do
        const currentTime = Math.floor(Date.now() / 1000);
        const deadline = currentTime + (7 * 24 * 60 * 60);
        
        const tx = await freelanceJob.connect(signer).createJob(
            "Frontend Test Job",
            "This job was created using the same parameters as the frontend",
            "development",
            ethers.parseEther("0.1"), // 0.1 ETH (above minimum)
            "0x0000000000000000000000000000000000000000", // ETH
            deadline,
            "QmJobMetadata123",
            [1, 2],
            [3, 4]
            // NO value parameter - this was the fix!
        );
        
        console.log("📝 Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Job created successfully!");
        console.log("📊 Block:", receipt.blockNumber);
        
        // Parse the event to get job ID
        const jobCreatedEvent = receipt.logs.find(log => {
            try {
                const decoded = freelanceJob.interface.parseLog(log);
                return decoded?.name === 'JobCreated';
            } catch {
                return false;
            }
        });
        
        if (jobCreatedEvent) {
            const decoded = freelanceJob.interface.parseLog(jobCreatedEvent);
            console.log("🎯 Job ID:", decoded.args[0].toString());
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
    
    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [userAddress],
    });
}

testFrontendFix().catch(console.error);