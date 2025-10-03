const { ethers } = require("hardhat");

async function debugJobCreation() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    
    // Impersonate your address
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2"],
    });
    
    const yourSigner = await ethers.getSigner("0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2");
    
    console.log("Testing job creation with your exact parameters...");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = currentBlock.timestamp;
    console.log("Current timestamp:", currentTimestamp);
    
    const deadline = currentTimestamp + (7 * 24 * 60 * 60); // 7 days from now
    console.log("Using deadline:", deadline);
    
    try {
        // Test the exact function call
        const tx = await freelanceJob.connect(yourSigner).createJob(
            "mmkxkmlxzkxzkmlxmxklxlx", // title from error
            "a sxjsjmxkasxkmasxkmlasxklmkmasxmklsaxkmlsxkmasxkmlaxslasxklmxas", // description from error  
            "development", // category
            ethers.parseEther("1000"), // budget - 1000 ETH (this might be the issue)
            "0x0000000000000000000000000000000000000000", // ETH payment
            deadline,
            "QmTestJobMetadata123", // IPFS hash
            [1, 2], // skill IDs
            [3, 4]  // skill levels
        );
        
        await tx.wait();
        console.log("Job created successfully:", tx.hash);
        
    } catch (error) {
        console.log("Error details:", error.message);
        
        // Try with smaller budget
        console.log("Trying with smaller budget...");
        try {
            const tx2 = await freelanceJob.connect(yourSigner).createJob(
                "Test Job",
                "Test Description", 
                "development",
                ethers.parseEther("1.0"), // 1 ETH instead of 1000
                "0x0000000000000000000000000000000000000000",
                deadline,
                "QmTestJobMetadata123",
                [1, 2],
                [3, 4]
            );
            
            await tx2.wait();
            console.log("Job created with smaller budget:", tx2.hash);
            
        } catch (error2) {
            console.log("Still failed with smaller budget:", error2.message);
        }
    }
    
    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: ["0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2"],
    });
}

debugJobCreation().catch(console.error);