import { ethers, Contract, Provider, Wallet } from 'ethers';
import { logger } from '@/config/logger';
import config from '@/config/app';

// Contract ABIs (simplified - would import from artifacts)
const GOVERNANCE_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function getStakeInfo(address user) view returns (uint256 amount, uint256 timestamp, uint256 rewards)',
  'function calculateRewards(address user) view returns (uint256)',
  'function claimRewards() returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
];

const USER_REGISTRY_ABI = [
  'function registerUser(address user, string memory profileHash, uint8 userType)',
  'function updateProfile(string memory profileHash)',
  'function getUserProfile(address user) view returns (string memory profileHash, uint8 userType, uint256 reputation, bool isActive)',
  'function updateReputation(address user, uint256 newReputation)',
  'function isRegistered(address user) view returns (bool)',
  'event UserRegistered(address indexed user, uint8 userType)',
  'event ProfileUpdated(address indexed user, string profileHash)',
];

const ESCROW_MANAGER_ABI = [
  'function createEscrow(uint256 jobId, address freelancer, address paymentToken, uint256 amount) returns (uint256)',
  'function releaseEscrow(uint256 escrowId)',
  'function refundEscrow(uint256 escrowId)',
  'function getEscrowDetails(uint256 escrowId) view returns (uint256 jobId, address client, address freelancer, address paymentToken, uint256 amount, uint8 status)',
  'event EscrowCreated(uint256 indexed escrowId, uint256 indexed jobId, address indexed freelancer, uint256 amount)',
  'event EscrowReleased(uint256 indexed escrowId, address indexed freelancer, uint256 amount)',
];

const FREELANCE_JOB_ABI = [
  'function createJob(string memory title, string memory description, string memory category, uint256 budget, address paymentToken, uint256 deadline, string memory metadataHash, uint256[] memory skillIds, uint256[] memory skillLevels) returns (uint256)',
  'function submitProposal(uint256 jobId, uint256 bidAmount, uint256 deliveryTime, string memory proposalHash)',
  'function selectFreelancer(uint256 jobId, address freelancer)',
  'function submitWork(uint256 jobId, string memory workHash)',
  'function approveWork(uint256 jobId)',
  'function getJobDetails(uint256 jobId) view returns (address client, string memory title, string memory description, uint256 budget, address paymentToken, uint8 status)',
  'event JobCreated(uint256 indexed jobId, address indexed client, uint256 budget)',
  'event ProposalSubmitted(uint256 indexed jobId, address indexed freelancer, uint256 bidAmount)',
  'event FreelancerSelected(uint256 indexed jobId, address indexed freelancer)',
];

interface BlockchainConfig {
  ethereumRpcUrl: string;
  polygonRpcUrl: string;
  privateKey?: string;
  contracts: {
    governanceToken?: string;
    userRegistry?: string;
    escrowManager?: string;
    freelanceJob?: string;
  };
}

export class BlockchainService {
  private ethereumProvider: Provider;
  private polygonProvider: Provider;
  private wallet?: Wallet;
  private contracts: {
    ethereum: Map<string, Contract>;
    polygon: Map<string, Contract>;
  };

  constructor() {
    this.contracts = {
      ethereum: new Map(),
      polygon: new Map(),
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize providers
      this.ethereumProvider = new ethers.JsonRpcProvider(config.blockchain.ethereumRpcUrl);
      this.polygonProvider = new ethers.JsonRpcProvider(config.blockchain.polygonRpcUrl);

      // Initialize wallet if private key is provided
      if (config.blockchain.privateKey) {
        this.wallet = new ethers.Wallet(config.blockchain.privateKey);
      }

      // Test connections
      await this.testConnections();

      // Initialize contracts
      await this.initializeContracts();

      logger.info('Blockchain service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  private async testConnections(): Promise<void> {
    try {
      const [ethBlockNumber, polygonBlockNumber] = await Promise.all([
        this.ethereumProvider.getBlockNumber(),
        this.polygonProvider.getBlockNumber(),
      ]);

      logger.info('Blockchain connections established', {
        ethereum: ethBlockNumber,
        polygon: polygonBlockNumber,
      });
    } catch (error) {
      logger.error('Failed to establish blockchain connections:', error);
      throw error;
    }
  }

  private async initializeContracts(): Promise<void> {
    const { contracts } = config.blockchain;

    try {
      // Initialize Ethereum contracts
      if (contracts.governanceToken) {
        this.contracts.ethereum.set(
          'governanceToken',
          new ethers.Contract(contracts.governanceToken, GOVERNANCE_TOKEN_ABI, this.ethereumProvider)
        );
      }

      if (contracts.userRegistry) {
        this.contracts.ethereum.set(
          'userRegistry',
          new ethers.Contract(contracts.userRegistry, USER_REGISTRY_ABI, this.ethereumProvider)
        );
      }

      if (contracts.escrowManager) {
        this.contracts.ethereum.set(
          'escrowManager',
          new ethers.Contract(contracts.escrowManager, ESCROW_MANAGER_ABI, this.ethereumProvider)
        );
      }

      if (contracts.freelanceJob) {
        this.contracts.ethereum.set(
          'freelanceJob',
          new ethers.Contract(contracts.freelanceJob, FREELANCE_JOB_ABI, this.ethereumProvider)
        );
      }

      logger.info('Smart contracts initialized');
    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  // Contract interaction methods
  async getGovernanceTokenBalance(address: string): Promise<string> {
    try {
      const contract = this.contracts.ethereum.get('governanceToken');
      if (!contract) throw new Error('Governance token contract not initialized');

      const balance = await contract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting token balance:', error);
      throw error;
    }
  }

  async getUserProfile(address: string): Promise<any> {
    try {
      const contract = this.contracts.ethereum.get('userRegistry');
      if (!contract) throw new Error('User registry contract not initialized');

      const profile = await contract.getUserProfile(address);
      return {
        profileHash: profile[0],
        userType: profile[1],
        reputation: Number(profile[2]),
        isActive: profile[3],
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  async getJobDetails(jobId: number): Promise<any> {
    try {
      const contract = this.contracts.ethereum.get('freelanceJob');
      if (!contract) throw new Error('Freelance job contract not initialized');

      const job = await contract.getJobDetails(jobId);
      return {
        client: job[0],
        title: job[1],
        description: job[2],
        budget: ethers.formatEther(job[3]),
        paymentToken: job[4],
        status: job[5],
      };
    } catch (error) {
      logger.error('Error getting job details:', error);
      throw error;
    }
  }

  async getEscrowDetails(escrowId: number): Promise<any> {
    try {
      const contract = this.contracts.ethereum.get('escrowManager');
      if (!contract) throw new Error('Escrow manager contract not initialized');

      const escrow = await contract.getEscrowDetails(escrowId);
      return {
        jobId: Number(escrow[0]),
        client: escrow[1],
        freelancer: escrow[2],
        paymentToken: escrow[3],
        amount: ethers.formatEther(escrow[4]),
        status: escrow[5],
      };
    } catch (error) {
      logger.error('Error getting escrow details:', error);
      throw error;
    }
  }

  // Event listening methods
  async startEventListeners(): Promise<void> {
    try {
      // Listen to governance token events
      const governanceToken = this.contracts.ethereum.get('governanceToken');
      if (governanceToken) {
        governanceToken.on('Transfer', (from, to, value, event) => {
          logger.info('Token transfer detected', {
            from,
            to,
            value: ethers.formatEther(value),
            txHash: event.log.transactionHash,
          });
        });

        governanceToken.on('Staked', (user, amount, event) => {
          logger.info('Token staking detected', {
            user,
            amount: ethers.formatEther(amount),
            txHash: event.log.transactionHash,
          });
        });
      }

      // Listen to job events
      const freelanceJob = this.contracts.ethereum.get('freelanceJob');
      if (freelanceJob) {
        freelanceJob.on('JobCreated', (jobId, client, budget, event) => {
          logger.info('Job created', {
            jobId: Number(jobId),
            client,
            budget: ethers.formatEther(budget),
            txHash: event.log.transactionHash,
          });
        });

        freelanceJob.on('ProposalSubmitted', (jobId, freelancer, bidAmount, event) => {
          logger.info('Proposal submitted', {
            jobId: Number(jobId),
            freelancer,
            bidAmount: ethers.formatEther(bidAmount),
            txHash: event.log.transactionHash,
          });
        });
      }

      // Listen to escrow events
      const escrowManager = this.contracts.ethereum.get('escrowManager');
      if (escrowManager) {
        escrowManager.on('EscrowCreated', (escrowId, jobId, freelancer, amount, event) => {
          logger.info('Escrow created', {
            escrowId: Number(escrowId),
            jobId: Number(jobId),
            freelancer,
            amount: ethers.formatEther(amount),
            txHash: event.log.transactionHash,
          });
        });

        escrowManager.on('EscrowReleased', (escrowId, freelancer, amount, event) => {
          logger.info('Escrow released', {
            escrowId: Number(escrowId),
            freelancer,
            amount: ethers.formatEther(amount),
            txHash: event.log.transactionHash,
          });
        });
      }

      logger.info('Blockchain event listeners started');
    } catch (error) {
      logger.error('Failed to start event listeners:', error);
      throw error;
    }
  }

  // Utility methods
  async getTransactionReceipt(txHash: string, network: 'ethereum' | 'polygon' = 'ethereum'): Promise<any> {
    try {
      const provider = network === 'ethereum' ? this.ethereumProvider : this.polygonProvider;
      return await provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  async estimateGas(to: string, data: string, network: 'ethereum' | 'polygon' = 'ethereum'): Promise<string> {
    try {
      const provider = network === 'ethereum' ? this.ethereumProvider : this.polygonProvider;
      const gasEstimate = await provider.estimateGas({ to, data });
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  async getGasPrice(network: 'ethereum' | 'polygon' = 'ethereum'): Promise<string> {
    try {
      const provider = network === 'ethereum' ? this.ethereumProvider : this.polygonProvider;
      const gasPrice = await provider.getFeeData();
      return ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei');
    } catch (error) {
      logger.error('Error getting gas price:', error);
      throw error;
    }
  }

  // Validation methods
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  isValidTransactionHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  // Cleanup
  async destroy(): Promise<void> {
    try {
      // Remove all event listeners
      for (const contract of this.contracts.ethereum.values()) {
        contract.removeAllListeners();
      }
      for (const contract of this.contracts.polygon.values()) {
        contract.removeAllListeners();
      }

      logger.info('Blockchain service destroyed');
    } catch (error) {
      logger.error('Error destroying blockchain service:', error);
    }
  }
}

export default BlockchainService;