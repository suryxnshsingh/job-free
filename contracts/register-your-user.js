const { ethers } = require("hardhat");

async function registerYourUser() {
    const userRegistry = await ethers.getContractAt("UserRegistry", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    // Use a Hardhat account to send ETH and call the registration for your address
    const signer = await ethers.getSigner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    
    console.log("Registering your address: 0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2");
    
    // Since your address needs to call registerUser itself, we need to fund it first
    // Then call registerUser from your address
    
    // First, send ETH to your address (already done - you have 10,000 ETH)
    
    // Now we need to register from your address, but Hardhat doesn't have the private key
    // So let's use impersonation
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2"],
    });
    
    const yourSigner = await ethers.getSigner("0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2");
    
    const tx = await userRegistry.connect(yourSigner).registerUser(2, "QmYourProfileHash123"); // UserType.Both = 2
    await tx.wait();
    
    console.log("Your address registered successfully:", tx.hash);
    
    // Stop impersonation
    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: ["0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2"],
    });
}

registerYourUser().catch(console.error);