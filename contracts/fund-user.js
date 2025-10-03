const { ethers } = require("hardhat");

async function fundUser() {
    const [deployer] = await ethers.getSigners();
    const userAddress = "0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2";
    
    console.log(`Sending 10,000 ETH to ${userAddress}...`);
    
    const tx = await deployer.sendTransaction({
        to: userAddress,
        value: ethers.parseEther("10000")
    });
    
    await tx.wait();
    console.log(`✅ Transfer complete! Transaction: ${tx.hash}`);
    
    const balance = await ethers.provider.getBalance(userAddress);
    console.log(`💰 New balance: ${ethers.formatEther(balance)} ETH`);
}

fundUser().catch(console.error);