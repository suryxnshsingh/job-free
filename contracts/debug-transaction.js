const { ethers } = require("hardhat");

async function debugTransaction() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    const userRegistry = await ethers.getContractAt("UserRegistry", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    const userAddress = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
    
    console.log("🔍 Debugging transaction requirements...");
    
    // Check contract constants
    const minJobBudget = await freelanceJob.MIN_JOB_BUDGET();
    const maxJobDuration = await freelanceJob.MAX_JOB_DURATION();
    
    console.log(`💰 MIN_JOB_BUDGET: ${ethers.formatEther(minJobBudget)} ETH`);
    console.log(`⏰ MAX_JOB_DURATION: ${maxJobDuration} seconds (${Number(maxJobDuration) / (24 * 60 * 60)} days)`);
    
    // Check user registration
    const userData = await userRegistry.users(userAddress);
    const isRegistered = userData[0] !== '0x0000000000000000000000000000000000000000';
    console.log(`👤 User ${userAddress} registered: ${isRegistered}`);
    
    if (isRegistered) {
        console.log(`📋 User data:`, {
            address: userData[0],
            profileHash: userData[1],
            userType: userData[2].toString()
        });
    }
    
    // Test parameters that might be used
    const currentTime = Math.floor(Date.now() / 1000);
    const testDeadline = currentTime + (7 * 24 * 60 * 60); // 7 days
    const testBudget = ethers.parseEther("1.0"); // 1 ETH
    
    console.log(`⏰ Current time: ${currentTime}`);
    console.log(`⏰ Test deadline: ${testDeadline} (${new Date(testDeadline * 1000)})`);
    console.log(`💰 Test budget: ${ethers.formatEther(testBudget)} ETH`);
    console.log(`✅ Budget >= MIN: ${testBudget >= minJobBudget}`);
    console.log(`✅ Deadline valid: ${testDeadline > currentTime && testDeadline <= currentTime + Number(maxJobDuration)}`);
    
    // Check if contract is paused
    const isPaused = await freelanceJob.paused();
    console.log(`⏸️ Contract paused: ${isPaused}`);
    
    console.log("\n🧪 Attempting a test call with valid parameters...");
    
    try {
        // Impersonate the user
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userAddress],
        });
        
        const signer = await ethers.getSigner(userAddress);
        
        // Try to estimate gas with proper parameters (NO VALUE SENT)
        const estimatedGas = await freelanceJob.connect(signer).createJob.estimateGas(
            "Debug Test Job",
            "Test job for debugging",
            "development",
            testBudget,
            "0x0000000000000000000000000000000000000000", // ETH
            testDeadline,
            "QmTestHash123",
            [1, 2],
            [3, 4]
            // NO value parameter - function is not payable
        );
        
        console.log(`⛽ Estimated gas: ${estimatedGas}`);
        console.log("✅ Gas estimation successful - transaction should work");
        
        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userAddress],
        });
        
    } catch (error) {
        console.log(`❌ Gas estimation failed: ${error.message}`);
        
        if (error.message.includes("NotAuthorized")) {
            console.log("🔍 Issue: User not authorized (likely not registered)");
        } else if (error.message.includes("InvalidAmount")) {
            console.log("🔍 Issue: Invalid amount (budget too low or value mismatch)");
        } else if (error.message.includes("InvalidDeadline")) {
            console.log("🔍 Issue: Invalid deadline");
        } else if (error.message.includes("InvalidSkillLevel")) {
            console.log("🔍 Issue: Skill IDs and levels length mismatch");
        }
        
        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userAddress],
        });
    }
}

debugTransaction().catch(console.error);