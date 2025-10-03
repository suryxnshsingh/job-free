const { ethers } = require("hardhat");

async function decodeTransaction() {
    // The problematic transaction data from the error
    const txData = "0x7b5945400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000003635c9adc5dea0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068e1876d0000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000126d6d736d736d736d736d736d736d736d736d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a6d6d6d6b6d6b6b6d61736d6b73616b6d61736b6d61736d6b61736b6d61736b6d61736d6b617361736d6b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b646576656c6f706d656e740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010516d4a6f624d6574616461746131323300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004";
    
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    
    console.log("🔍 Decoding problematic transaction data...");
    
    try {
        // Decode the transaction data
        const decodedData = freelanceJob.interface.parseTransaction({ data: txData });
        
        console.log("📊 Function:", decodedData.name);
        console.log("📊 Args:");
        console.log("  - Title:", decodedData.args[0]);
        console.log("  - Description:", decodedData.args[1]);
        console.log("  - Category:", decodedData.args[2]);
        console.log("  - Budget:", ethers.formatEther(decodedData.args[3]), "ETH");
        console.log("  - Payment Token:", decodedData.args[4]);
        console.log("  - Deadline:", decodedData.args[5].toString(), "(" + new Date(Number(decodedData.args[5]) * 1000) + ")");
        console.log("  - Metadata Hash:", decodedData.args[6]);
        console.log("  - Skill IDs:", decodedData.args[7].toString());
        console.log("  - Skill Levels:", decodedData.args[8].toString());
        
        // Check if deadline is valid
        const currentTime = Math.floor(Date.now() / 1000);
        const deadline = Number(decodedData.args[5]);
        
        console.log("\n🔍 Validation checks:");
        console.log("  - Current time:", currentTime);
        console.log("  - Transaction deadline:", deadline);
        console.log("  - Deadline in future:", deadline > currentTime);
        console.log("  - Budget >= 0.01 ETH:", ethers.formatEther(decodedData.args[3]) >= "0.01");
        console.log("  - Skill arrays same length:", decodedData.args[7].length === decodedData.args[8].length);
        
        // The deadline looks suspicious - let me check if it's a timestamp issue
        if (deadline < currentTime) {
            console.log("❌ PROBLEM: Deadline is in the past!");
            console.log("   Frontend might be passing wrong timestamp format");
        }
        
    } catch (error) {
        console.log("❌ Error decoding:", error.message);
    }
}

decodeTransaction().catch(console.error);