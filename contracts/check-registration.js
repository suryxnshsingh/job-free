const { ethers } = require("hardhat");

async function checkRegistration() {
    const userRegistry = await ethers.getContractAt("UserRegistry", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    const userAddress = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
    
    console.log("Checking registration for:", userAddress);
    
    try {
        const userData = await userRegistry.users(userAddress);
        console.log("User data:", userData);
        
        if (userData[0] !== "0x0000000000000000000000000000000000000000") {
            console.log("✅ User IS registered");
            console.log("- Address:", userData[0]);
            console.log("- Profile Hash:", userData[1]);
            console.log("- User Type:", userData[2].toString());
        } else {
            console.log("❌ User is NOT registered");
            
            // Try to register the user
            console.log("Attempting to register user...");
            
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [userAddress],
            });
            
            const signer = await ethers.getSigner(userAddress);
            
            try {
                const tx = await userRegistry.connect(signer).registerUser(2, "QmTestProfile123");
                await tx.wait();
                console.log("✅ User registered successfully");
            } catch (error) {
                console.log("❌ Registration failed:", error.message);
                console.log("Error data:", error.data);
            }
            
            await network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [userAddress],
            });
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkRegistration().catch(console.error);