import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
    GovernanceToken, 
    UserRegistry, 
    EscrowManager, 
    DisputeResolution, 
    FreelanceJob 
} from "../typechain-types";

export interface ContractFixture {
    governanceToken: GovernanceToken;
    userRegistry: UserRegistry;
    escrowManager: EscrowManager;
    disputeResolution: DisputeResolution;
    freelanceJob: FreelanceJob;
    owner: SignerWithAddress;
    client: SignerWithAddress;
    freelancer: SignerWithAddress;
    arbitrator1: SignerWithAddress;
    arbitrator2: SignerWithAddress;
    arbitrator3: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
}

export async function deployContractsFixture(): Promise<ContractFixture> {
    const [owner, client, freelancer, arbitrator1, arbitrator2, arbitrator3, user1, user2] = 
        await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
    const governanceToken = await GovernanceTokenFactory.deploy();

    // Deploy UserRegistry
    const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistryFactory.deploy(await governanceToken.getAddress());

    // Deploy EscrowManager
    const EscrowManagerFactory = await ethers.getContractFactory("EscrowManager");
    const escrowManager = await EscrowManagerFactory.deploy(owner.address);

    // Deploy DisputeResolution
    const DisputeResolutionFactory = await ethers.getContractFactory("DisputeResolution");
    const disputeResolution = await DisputeResolutionFactory.deploy(
        await userRegistry.getAddress(),
        await escrowManager.getAddress(),
        await governanceToken.getAddress()
    );

    // Deploy FreelanceJob
    const FreelanceJobFactory = await ethers.getContractFactory("FreelanceJob");
    const freelanceJob = await FreelanceJobFactory.deploy(
        await userRegistry.getAddress(),
        await escrowManager.getAddress(),
        await disputeResolution.getAddress(),
        await governanceToken.getAddress()
    );

    // Setup cross-contract authorizations
    await escrowManager.addAuthorizedCaller(await freelanceJob.getAddress());
    await escrowManager.addAuthorizedCaller(await disputeResolution.getAddress());

    // Distribute tokens to test accounts
    const initialTokens = ethers.parseEther("10000");
    await governanceToken.transfer(client.address, initialTokens);
    await governanceToken.transfer(freelancer.address, initialTokens);
    await governanceToken.transfer(arbitrator1.address, initialTokens);
    await governanceToken.transfer(arbitrator2.address, initialTokens);
    await governanceToken.transfer(arbitrator3.address, initialTokens);
    await governanceToken.transfer(user1.address, initialTokens);
    await governanceToken.transfer(user2.address, initialTokens);

    return {
        governanceToken,
        userRegistry,
        escrowManager,
        disputeResolution,
        freelanceJob,
        owner,
        client,
        freelancer,
        arbitrator1,
        arbitrator2,
        arbitrator3,
        user1,
        user2,
    };
}

export async function setupRegisteredUsers(contracts: ContractFixture) {
    const { userRegistry, governanceToken, client, freelancer, arbitrator1, arbitrator2, arbitrator3 } = contracts;

    // Register client
    await userRegistry.connect(client).registerUser(0, "QmClientProfile"); // UserType.Client = 0

    // Register freelancer
    await userRegistry.connect(freelancer).registerUser(1, "QmFreelancerProfile"); // UserType.Freelancer = 1

    // Register arbitrators
    await userRegistry.connect(arbitrator1).registerUser(2, "QmArbitrator1Profile"); // UserType.Both = 2
    await userRegistry.connect(arbitrator2).registerUser(2, "QmArbitrator2Profile");
    await userRegistry.connect(arbitrator3).registerUser(2, "QmArbitrator3Profile");

    // Stake tokens for freelancer and arbitrators
    const stakeAmount = ethers.parseEther("1000");
    
    // Approve and stake for freelancer
    await governanceToken.connect(freelancer).approve(await userRegistry.getAddress(), stakeAmount);
    await userRegistry.connect(freelancer).stakeTokens(stakeAmount);

    // Approve and stake for arbitrators
    for (const arbitrator of [arbitrator1, arbitrator2, arbitrator3]) {
        await governanceToken.connect(arbitrator).approve(await userRegistry.getAddress(), stakeAmount);
        await userRegistry.connect(arbitrator).stakeTokens(stakeAmount);
    }
}

export async function createSampleJob(contracts: ContractFixture): Promise<number> {
    const { freelanceJob, client } = contracts;

    const jobData = {
        title: "Build a DApp",
        description: "Need a React developer for blockchain integration",
        category: "Development",
        budget: ethers.parseEther("1"),
        paymentToken: ethers.ZeroAddress, // ETH
        deadline: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
        metadataHash: "QmJobMetadata123",
        skillIds: [1, 2], // Mock skill IDs
        skillLevels: [4, 3], // Required skill levels
    };

    const tx = await freelanceJob.connect(client).createJob(
        jobData.title,
        jobData.description,
        jobData.category,
        jobData.budget,
        jobData.paymentToken,
        jobData.deadline,
        jobData.metadataHash,
        jobData.skillIds,
        jobData.skillLevels
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(log => {
        try {
            return freelanceJob.interface.parseLog(log as any)?.name === 'JobCreated';
        } catch {
            return false;
        }
    });

    if (event) {
        const parsedEvent = freelanceJob.interface.parseLog(event as any);
        return Number(parsedEvent?.args[0]); // jobId
    }

    return 1; // Default to job ID 1
}

export async function submitBidToJob(
    contracts: ContractFixture, 
    jobId: number, 
    freelancer: SignerWithAddress
): Promise<void> {
    const { freelanceJob, governanceToken } = contracts;

    const bidData = {
        amount: ethers.parseEther("0.8"),
        deliveryTime: 5, // 5 days
        proposalHash: "QmProposalHash123",
        portfolioHash: "QmPortfolioHash123",
        stakeAmount: ethers.parseEther("100"),
    };

    // Approve tokens for staking
    await governanceToken.connect(freelancer).approve(
        await freelanceJob.getAddress(), 
        bidData.stakeAmount
    );

    await freelanceJob.connect(freelancer).submitBid(
        jobId,
        bidData.amount,
        bidData.deliveryTime,
        bidData.proposalHash,
        bidData.portfolioHash,
        bidData.stakeAmount
    );
}

export const testConstants = {
    MIN_STAKE_AMOUNT: ethers.parseEther("100"),
    INITIAL_REPUTATION: 500,
    ARBITRATOR_STAKE: ethers.parseEther("1000"),
    DEFAULT_JOB_BUDGET: ethers.parseEther("1"),
    BID_STAKE: ethers.parseEther("100"),
};

export function expectEvent(receipt: any, contractInterface: any, eventName: string) {
    const event = receipt.logs.find((log: any) => {
        try {
            const parsed = contractInterface.parseLog(log);
            return parsed?.name === eventName;
        } catch {
            return false;
        }
    });
    expect(event).to.not.be.undefined;
    return contractInterface.parseLog(event);
}

export async function advanceTimeAndBlock(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

export async function getCurrentTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
}