import { ethers } from "hardhat";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface DeploymentResult {
  network: string;
  deployer: string;
  contracts: {
    GovernanceToken: string;
    UserRegistry: string;
    EscrowManager: string;
    DisputeResolution: string;
    FreelanceJob: string;
  };
  gasUsed: {
    total: bigint;
    individual: Record<string, bigint>;
  };
  timestamp: number;
}

async function main() {
  console.log("🚀 Starting FreelanceDAO deployment...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deployment Configuration:");
  console.log("├── Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("├── Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("├── Balance:", ethers.formatEther(balance), "ETH");
  console.log("└── Timestamp:", new Date().toISOString());
  console.log("");

  // Check minimum balance requirement
  const minBalance = ethers.parseEther("0.1");
  if (balance < minBalance) {
    throw new Error(`❌ Insufficient balance. Minimum required: ${ethers.formatEther(minBalance)} ETH`);
  }

  const gasUsed: Record<string, bigint> = {};
  let totalGasUsed = BigInt(0);

  // 1. Deploy GovernanceToken
  console.log("📄 Deploying GovernanceToken...");
  const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceTokenFactory.deploy();
  await governanceToken.waitForDeployment();
  
  const governanceTokenReceipt = await governanceToken.deploymentTransaction()?.wait();
  gasUsed.GovernanceToken = governanceTokenReceipt?.gasUsed || BigInt(0);
  totalGasUsed += gasUsed.GovernanceToken;
  
  console.log("✅ GovernanceToken deployed to:", await governanceToken.getAddress());
  console.log("├── Gas used:", gasUsed.GovernanceToken.toString());
  console.log("└── Initial supply:", ethers.formatEther(await governanceToken.totalSupply()), "FDAO");

  // 2. Deploy UserRegistry
  console.log("\n📄 Deploying UserRegistry...");
  const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistryFactory.deploy(await governanceToken.getAddress());
  await userRegistry.waitForDeployment();
  
  const userRegistryReceipt = await userRegistry.deploymentTransaction()?.wait();
  gasUsed.UserRegistry = userRegistryReceipt?.gasUsed || BigInt(0);
  totalGasUsed += gasUsed.UserRegistry;
  
  console.log("✅ UserRegistry deployed to:", await userRegistry.getAddress());
  console.log("└── Gas used:", gasUsed.UserRegistry.toString());

  // 3. Deploy EscrowManager
  console.log("\n📄 Deploying EscrowManager...");
  const EscrowManagerFactory = await ethers.getContractFactory("EscrowManager");
  const escrowManager = await EscrowManagerFactory.deploy(deployer.address); // Fee collector
  await escrowManager.waitForDeployment();
  
  const escrowManagerReceipt = await escrowManager.deploymentTransaction()?.wait();
  gasUsed.EscrowManager = escrowManagerReceipt?.gasUsed || BigInt(0);
  totalGasUsed += gasUsed.EscrowManager;
  
  console.log("✅ EscrowManager deployed to:", await escrowManager.getAddress());
  console.log("└── Gas used:", gasUsed.EscrowManager.toString());

  // 4. Deploy DisputeResolution
  console.log("\n📄 Deploying DisputeResolution...");
  const DisputeResolutionFactory = await ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolutionFactory.deploy(
    await userRegistry.getAddress(),
    await escrowManager.getAddress(),
    await governanceToken.getAddress()
  );
  await disputeResolution.waitForDeployment();
  
  const disputeResolutionReceipt = await disputeResolution.deploymentTransaction()?.wait();
  gasUsed.DisputeResolution = disputeResolutionReceipt?.gasUsed || BigInt(0);
  totalGasUsed += gasUsed.DisputeResolution;
  
  console.log("✅ DisputeResolution deployed to:", await disputeResolution.getAddress());
  console.log("└── Gas used:", gasUsed.DisputeResolution.toString());

  // 5. Deploy FreelanceJob (Main Contract)
  console.log("\n📄 Deploying FreelanceJob...");
  const FreelanceJobFactory = await ethers.getContractFactory("FreelanceJob");
  const freelanceJob = await FreelanceJobFactory.deploy(
    await userRegistry.getAddress(),
    await escrowManager.getAddress(),
    await disputeResolution.getAddress(),
    await governanceToken.getAddress()
  );
  await freelanceJob.waitForDeployment();
  
  const freelanceJobReceipt = await freelanceJob.deploymentTransaction()?.wait();
  gasUsed.FreelanceJob = freelanceJobReceipt?.gasUsed || BigInt(0);
  totalGasUsed += gasUsed.FreelanceJob;
  
  console.log("✅ FreelanceJob deployed to:", await freelanceJob.getAddress());
  console.log("└── Gas used:", gasUsed.FreelanceJob.toString());

  // 6. Setup cross-contract authorizations
  console.log("\n🔗 Setting up contract authorizations...");
  
  console.log("├── Authorizing FreelanceJob in EscrowManager...");
  const authTx1 = await escrowManager.addAuthorizedCaller(await freelanceJob.getAddress());
  await authTx1.wait();
  
  console.log("├── Authorizing DisputeResolution in EscrowManager...");
  const authTx2 = await escrowManager.addAuthorizedCaller(await disputeResolution.getAddress());
  await authTx2.wait();
  
  console.log("└── Authorization setup completed");

  // 7. Add supported tokens to EscrowManager
  console.log("\n💰 Configuring supported tokens...");
  
  // ETH is already supported by default (address(0))
  console.log("├── ETH support: Already configured");
  
  // Add governance token as supported payment method
  console.log("├── Adding FDAO token support...");
  const addTokenTx = await escrowManager.addSupportedToken(await governanceToken.getAddress());
  await addTokenTx.wait();
  
  console.log("└── Token configuration completed");

  // 8. Verification and summary
  console.log("\n🎯 Deployment Summary:");
  console.log("├── Total gas used:", totalGasUsed.toString());
  
  const gasPrice = (await ethers.provider.getFeeData()).gasPrice || BigInt(0);
  const totalCost = totalGasUsed * gasPrice;
  console.log("├── Total cost:", ethers.formatEther(totalCost), "ETH");
  console.log("├── Contracts deployed: 5");
  console.log("└── Status: ✅ All contracts deployed successfully");

  // 9. Save deployment information
  const deploymentResult: DeploymentResult = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      GovernanceToken: await governanceToken.getAddress(),
      UserRegistry: await userRegistry.getAddress(),
      EscrowManager: await escrowManager.getAddress(),
      DisputeResolution: await disputeResolution.getAddress(),
      FreelanceJob: await freelanceJob.getAddress(),
    },
    gasUsed: {
      total: totalGasUsed,
      individual: gasUsed,
    },
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = join(__dirname, "..", "deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentFile = join(deploymentsDir, `${network.name}.json`);
  writeFileSync(deploymentFile, JSON.stringify(deploymentResult, null, 2));
  
  console.log("\n💾 Deployment information saved to:", deploymentFile);

  // 10. Contract verification instructions
  console.log("\n🔍 Contract Verification:");
  console.log("Run the following commands to verify contracts on Etherscan:");
  console.log("");
  
  console.log("GovernanceToken:");
  console.log(`npx hardhat verify --network ${network.name} ${await governanceToken.getAddress()}`);
  console.log("");
  
  console.log("UserRegistry:");
  console.log(`npx hardhat verify --network ${network.name} ${await userRegistry.getAddress()} "${await governanceToken.getAddress()}"`);
  console.log("");
  
  console.log("EscrowManager:");
  console.log(`npx hardhat verify --network ${network.name} ${await escrowManager.getAddress()} "${deployer.address}"`);
  console.log("");
  
  console.log("DisputeResolution:");
  console.log(`npx hardhat verify --network ${network.name} ${await disputeResolution.getAddress()} "${await userRegistry.getAddress()}" "${await escrowManager.getAddress()}" "${await governanceToken.getAddress()}"`);
  console.log("");
  
  console.log("FreelanceJob:");
  console.log(`npx hardhat verify --network ${network.name} ${await freelanceJob.getAddress()} "${await userRegistry.getAddress()}" "${await escrowManager.getAddress()}" "${await disputeResolution.getAddress()}" "${await governanceToken.getAddress()}"`);

  // 11. Frontend configuration
  console.log("\n⚙️ Frontend Configuration:");
  console.log("Add these contract addresses to your frontend environment:");
  console.log("");
  console.log(`NEXT_PUBLIC_GOVERNANCE_TOKEN_CONTRACT="${await governanceToken.getAddress()}"`);
  console.log(`NEXT_PUBLIC_USER_REGISTRY_CONTRACT="${await userRegistry.getAddress()}"`);
  console.log(`NEXT_PUBLIC_ESCROW_MANAGER_CONTRACT="${await escrowManager.getAddress()}"`);
  console.log(`NEXT_PUBLIC_DISPUTE_RESOLUTION_CONTRACT="${await disputeResolution.getAddress()}"`);
  console.log(`NEXT_PUBLIC_FREELANCE_JOB_CONTRACT="${await freelanceJob.getAddress()}"`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📚 Next steps:");
  console.log("├── Verify contracts on block explorer");
  console.log("├── Update frontend configuration");
  console.log("├── Test contract interactions");
  console.log("└── Deploy backend API");
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });