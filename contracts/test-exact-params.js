const { ethers } = require("hardhat");

async function testExactParams() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    const userRegistry = await ethers.getContractAt("UserRegistry", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    const userAddress = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
    
    console.log("🧪 Testing with exact parameters from failed transaction...");
    
    // Exact parameters from the failed transaction
    const title = "mmsmsmsmsmsmsmsmsm";
    const description = "mmmkmkkmasmksakmaskmasmkaskmaskmasmkasasmk";
    const category = "development";
    const budget = ethers.parseEther("1000.0");
    const paymentToken = "0x0000000000000000000000000000000000000000";
    const deadline = 1759610733;
    const metadataHash = "QmJobMetadata123";
    const skillIds = [1, 2];
    const skillLevels = [3, 4];
    
    console.log("📊 Parameters:");
    console.log("  - Title:", title);
    console.log("  - Description:", description);
    console.log("  - Budget:", ethers.formatEther(budget), "ETH");
    console.log("  - Deadline:", deadline, "(" + new Date(deadline * 1000) + ")");
    
    // Check user registration first
    const userData = await userRegistry.users(userAddress);
    const isRegistered = userData[0] !== '0x0000000000000000000000000000000000000000';
    console.log("👤 User registered:", isRegistered);
    
    if (!isRegistered) {
        console.log("❌ User not registered - this might be the issue!");
        return;
    }
    
    // Check contract constants
    const minBudget = await freelanceJob.MIN_JOB_BUDGET();
    const maxDuration = await freelanceJob.MAX_JOB_DURATION();
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log("🔍 Validation checks:");
    console.log("  - Budget >= MIN:", budget >= minBudget, `(${ethers.formatEther(budget)} >= ${ethers.formatEther(minBudget)})`);
    console.log("  - Current time:", currentTime);
    console.log("  - Deadline > now:", deadline > currentTime);
    console.log("  - Deadline <= max:", deadline <= currentTime + Number(maxDuration));
    console.log("  - Skill arrays match:", skillIds.length === skillLevels.length);
    
    // Check if all skill levels are valid (1-5)
    const validSkillLevels = skillLevels.every(level => level >= 1 && level <= 5);
    console.log("  - Valid skill levels (1-5):", validSkillLevels, skillLevels);
    
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [userAddress],
    });
    
    const signer = await ethers.getSigner(userAddress);
    
    try {
        console.log("\n🔧 Attempting transaction...");
        
        const tx = await freelanceJob.connect(signer).createJob(
            title,
            description,
            category,
            budget,
            paymentToken,
            deadline,
            metadataHash,
            skillIds,
            skillLevels
        );
        
        console.log("✅ Transaction successful:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
    } catch (error) {
        console.log("❌ Transaction failed:", error.message);
        
        // Try to identify specific error
        if (error.message.includes("NotAuthorized")) {
            console.log("🔍 Issue: User not authorized (registration problem)");
        } else if (error.message.includes("InvalidAmount")) {
            console.log("🔍 Issue: Invalid amount (budget issue)");
        } else if (error.message.includes("InvalidDeadline")) {
            console.log("🔍 Issue: Invalid deadline");
        } else if (error.message.includes("InvalidSkillLevel")) {
            console.log("🔍 Issue: Invalid skill level");
        } else if (error.message.includes("Pausable: paused")) {
            console.log("🔍 Issue: Contract is paused");
        } else {
            console.log("🔍 Issue: Unknown error -", error.message);
        }
    }
    
    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [userAddress],
    });
}

testExactParams().catch(console.error);