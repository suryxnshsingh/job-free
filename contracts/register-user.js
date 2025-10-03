const { ethers } = require("hardhat");

async function registerUser() {
    const userRegistry = await ethers.getContractAt("UserRegistry", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    const signer = await ethers.getSigner("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
    
    console.log("Registering user...");
    const tx = await userRegistry.connect(signer).registerUser(0, "QmTestProfile123");
    await tx.wait();
    console.log("User registered successfully:", tx.hash);
}

registerUser().catch(console.error);