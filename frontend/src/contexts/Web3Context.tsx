'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers';
import { Toast } from '@/components/ui/toast';

// Contract ABIs
const GOVERNANCE_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function getStakeInfo(address user) view returns (uint256 amount, uint256 timestamp, uint256 rewards)',
  'function calculateRewards(address user) view returns (uint256)',
  'function claimRewards() returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
];

const USER_REGISTRY_ABI = [
  'function registerUser(uint8 _userType, string calldata _profileHash) external',
  'function updateProfile(string calldata _profileHash) external',
  'function users(address) external view returns (address, string, uint8, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)',
  'function isRegistered(address user) external view returns (bool)',
  'event UserRegistered(address indexed user, uint8 userType)',
  'event ProfileUpdated(address indexed user, string profileHash)',
];

const FREELANCE_JOB_ABI = [
  'function createJob(string calldata _title, string calldata _description, string calldata _category, uint256 _budget, address _paymentToken, uint256 _deadline, string calldata _metadataHash, uint256[] calldata _skillIds, uint256[] calldata _skillLevels) external returns (uint256)',
  'function submitBid(uint256 _jobId, uint256 _amount, uint256 _deliveryTime, string calldata _proposalHash, string calldata _portfolioHash, uint256 _stakeAmount) external payable',
  'function selectFreelancer(uint256 jobId, address freelancer)',
  'function submitWork(uint256 jobId, string memory workHash)',
  'function approveWork(uint256 jobId)',
  'function jobs(uint256) view returns (uint256 id, address client, address freelancer, string title, string description, string category, uint256 budget, address paymentToken, uint256 deadline, uint8 status, string metadataHash)',
  'function getJobBids(uint256 _jobId) view returns (tuple(uint256 id, uint256 jobId, address freelancer, uint256 amount, uint256 deliveryTime, string proposalHash, uint256 stakedAmount, uint8 status, uint256 createdAt, string portfolioHash)[])',
  'function totalJobs() view returns (uint256)',
  'function nextJobId() view returns (uint256)',
  'event JobCreated(uint256 indexed jobId, address indexed client, uint256 budget)',
  'event BidSubmitted(uint256 indexed jobId, address indexed freelancer, uint256 bidAmount, uint256 stakeAmount)',
  'event FreelancerSelected(uint256 indexed jobId, address indexed freelancer)',
];

const ESCROW_MANAGER_ABI = [
  'function createEscrow(uint256 jobId, address freelancer, address paymentToken, uint256 amount) returns (uint256)',
  'function releaseEscrow(uint256 escrowId)',
  'function refundEscrow(uint256 escrowId)',
  'function getEscrowDetails(uint256 escrowId) view returns (uint256 jobId, address client, address freelancer, address paymentToken, uint256 amount, uint8 status)',
  'event EscrowCreated(uint256 indexed escrowId, uint256 indexed jobId, address indexed freelancer, uint256 amount)',
  'event EscrowReleased(uint256 indexed escrowId, address indexed freelancer, uint256 amount)',
];

// Types
interface UserProfile {
  profileHash: string;
  userType: number;
  reputation: number;
  isActive: boolean;
}

interface Job {
  id: string;
  client: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  paymentToken: string;
  deadline: number;
  status: number;
  metadataHash: string;
}

interface StakeInfo {
  amount: string;
  timestamp: number;
  rewards: string;
}

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  balance: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;

  // Connection methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;

  // Contract interactions
  getUserProfile: (address: string) => Promise<UserProfile | null>;
  isUserRegistered: (address: string) => Promise<boolean>;
  registerUser: (profileHash: string, userType: number) => Promise<boolean>;
  updateProfile: (profileHash: string) => Promise<boolean>;

  // Token operations
  getTokenBalance: (address: string) => Promise<string>;
  stakeTokens: (amount: string) => Promise<boolean>;
  unstakeTokens: (amount: string) => Promise<boolean>;
  getStakeInfo: (address: string) => Promise<StakeInfo | null>;
  claimRewards: () => Promise<boolean>;

  // Job operations
  createJob: (
    title: string,
    description: string,
    category: string,
    budget: string,
    paymentToken: string,
    deadline: number,
    metadataHash: string,
    skillIds: number[],
    skillLevels: number[]
  ) => Promise<string | null>;
  getJobDetails: (jobId: string) => Promise<Job | null>;
  getAllJobs: () => Promise<Job[]>;
  submitBid: (jobId: string, bidAmount: string, deliveryTime: number, proposalHash: string, portfolioHash: string, stakeAmount: string) => Promise<boolean>;
  getJobBids: (jobId: string) => Promise<any[]>;
  selectFreelancer: (jobId: string, freelancer: string) => Promise<boolean>;
  submitWork: (jobId: string, workHash: string) => Promise<boolean>;
  approveWork: (jobId: string) => Promise<boolean>;

  // Escrow operations
  getEscrowDetails: (escrowId: string) => Promise<any>;

  // Utility
  formatEther: (wei: string) => string;
  parseEther: (ether: string) => string;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState('0');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  // Contract addresses from environment - using latest deployed addresses
  const GOVERNANCE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_CONTRACT || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const USER_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_USER_REGISTRY_CONTRACT || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
  const FREELANCE_JOB_ADDRESS = process.env.NEXT_PUBLIC_FREELANCE_JOB_CONTRACT || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
  const ESCROW_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_MANAGER_CONTRACT || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

  // Debug environment variables
  useEffect(() => {
    console.log('🔍 Contract addresses loaded:', {
      GOVERNANCE_TOKEN_ADDRESS,
      USER_REGISTRY_ADDRESS,
      FREELANCE_JOB_ADDRESS,
      ESCROW_MANAGER_ADDRESS,
      CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
      RPC_URL: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL
    });
  }, []);

  // Initialize provider and check for existing connections
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);

      // Check for existing connection
      checkConnection();

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    try {
      console.log('🔍 Checking existing wallet connection...');
      if (!provider) {
        console.log('❌ No provider available');
        return;
      }

      const accounts = await provider.listAccounts();
      console.log('👥 Existing accounts found:', accounts.length);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(account.address);
        
        console.log('✅ Existing connection restored:', {
          address: account.address,
          chainId: Number(network.chainId),
          balance: ethers.formatEther(balance)
        });
        
        setAccount(account.address);
        setChainId(Number(network.chainId));
        setBalance(ethers.formatEther(balance));
        setIsConnected(true);
        setSigner(await provider.getSigner());
      } else {
        console.log('💡 No existing connection found');
      }
    } catch (error) {
      console.error('❌ Error checking connection:', error);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      if (provider) {
        const balance = await provider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(balance));
        setSigner(await provider.getSigner());
      }
    }
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16));
    window.location.reload(); // Reload to ensure clean state
  };

  const connectWallet = async () => {
    try {
      console.log('🔗 Starting wallet connection...');
      
      if (!window.ethereum) {
        console.error('❌ MetaMask not found');
        alert('Please install MetaMask to use this application');
        return;
      }

      // Clear any existing state first
      setIsConnected(false);
      setAccount(null);
      setChainId(null);
      setBalance('0');
      setProvider(null);
      setSigner(null);

      console.log('✅ MetaMask detected, requesting accounts...');
      
      // Request accounts first
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Switch to target network BEFORE creating provider
      const targetChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
      console.log('🔄 Ensuring correct network...');
      
      try {
        await switchNetwork(targetChainId);
      } catch (networkError) {
        console.log('Network switch failed, continuing with current network');
      }

      // Wait longer for network to settle and clear any cached state
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Force MetaMask to refresh by requesting accounts again
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create fresh provider instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get current block number to ensure we're on latest state
      const currentBlock = await provider.getBlockNumber();
      console.log('📊 Current block number:', currentBlock);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      console.log('✅ Getting balance with fresh provider...');
      
      // Try multiple times to get balance, handling stale state
      let balance;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          // Always use current block for balance query
          balance = await provider.getBalance(address, currentBlock);
          break;
        } catch (balanceError: any) {
          attempts++;
          console.log(`⚠️ Balance fetch attempt ${attempts} failed:`, balanceError.message);
          
          if (attempts >= maxAttempts) {
            // If balance fetch fails, set to 0 but continue with connection
            console.log('Setting balance to 0 due to fetch failure');
            balance = BigInt(0);
          } else {
            // Wait and try again with a new provider
            await new Promise(resolve => setTimeout(resolve, 1000));
            const freshProvider = new ethers.BrowserProvider(window.ethereum);
            const latestBlock = await freshProvider.getBlockNumber();
            console.log('🔄 Retrying with block:', latestBlock);
          }
        }
      }

      console.log('✅ Wallet connected successfully:', {
        address,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
        currentBlock
      });

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setChainId(Number(network.chainId));
      setBalance(ethers.formatEther(balance));
      setIsConnected(true);

    } catch (error: any) {
      console.error('❌ Error connecting wallet:', error);
      
      // Clear state on error
      setIsConnected(false);
      setAccount(null);
      setChainId(null);
      setBalance('0');
      setProvider(null);
      setSigner(null);
      
      if (error.code === 4001) {
        alert('Please connect to MetaMask.');
      } else {
        alert(`Connection failed. Please refresh the page and try again.`);
      }
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
    setBalance('0');
    setProvider(null);
    setSigner(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    try {
      if (!window.ethereum) return;

      const chainIdHex = `0x${targetChainId.toString(16)}`;
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: 'Hardhat Local',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL],
                blockExplorerUrls: null,
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('Error switching network:', error);
      alert('Failed to switch network. Please switch manually in MetaMask.');
    }
  };

  // Contract helper functions
  const getGovernanceTokenContract = () => {
    if (!signer) throw new Error('Wallet not connected');
    console.log('📄 Creating GovernanceToken contract at:', GOVERNANCE_TOKEN_ADDRESS);
    return new ethers.Contract(GOVERNANCE_TOKEN_ADDRESS, GOVERNANCE_TOKEN_ABI, signer);
  };

  const getUserRegistryContract = () => {
    if (!provider) throw new Error('Provider not available');
    console.log('📄 Creating UserRegistry contract at:', USER_REGISTRY_ADDRESS);
    return new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider);
  };

  const getUserRegistryContractWithSigner = () => {
    if (!signer) throw new Error('Wallet not connected');
    console.log('📄 Creating UserRegistry contract with signer at:', USER_REGISTRY_ADDRESS);
    return new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer);
  };

  const getFreelanceJobContract = () => {
    if (!signer) throw new Error('Wallet not connected');
    console.log('📄 Creating FreelanceJob contract at:', FREELANCE_JOB_ADDRESS);
    return new ethers.Contract(FREELANCE_JOB_ADDRESS, FREELANCE_JOB_ABI, signer);
  };

  const getEscrowManagerContract = () => {
    if (!provider) throw new Error('Provider not available');
    console.log('📄 Creating EscrowManager contract at:', ESCROW_MANAGER_ADDRESS);
    return new ethers.Contract(ESCROW_MANAGER_ADDRESS, ESCROW_MANAGER_ABI, provider);
  };

  // User operations
  const getUserProfile = async (address: string): Promise<UserProfile | null> => {
    try {
      const contract = getUserRegistryContract();
      const profile = await contract.getUserProfile(address);
      return {
        profileHash: profile[0],
        userType: Number(profile[1]),
        reputation: Number(profile[2]),
        isActive: profile[3],
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  const isUserRegistered = async (address: string): Promise<boolean> => {
    try {
      const contract = getUserRegistryContract();
      const userData = await contract.users(address);
      // Check if the first field (address) is not zero address
      return userData[0] !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  };

  const registerUser = async (profileHash: string, userType: number): Promise<boolean> => {
    try {
      if (!account) throw new Error('Wallet not connected');
      console.log('🔄 Registering user:', { account, userType, profileHash });
      const contract = getUserRegistryContractWithSigner();
      const tx = await contract.registerUser(userType, profileHash);
      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ User registered successfully:', receipt.hash);
      return true;
    } catch (error: any) {
      console.error('❌ Error registering user:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  };

  const updateProfile = async (profileHash: string): Promise<boolean> => {
    try {
      const contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer);
      const tx = await contract.updateProfile(profileHash);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  // Token operations
  const getTokenBalance = async (address: string): Promise<string> => {
    try {
      console.log('🔄 Getting token balance for:', address);
      
      // Use provider for read-only operations
      const contract = new ethers.Contract(GOVERNANCE_TOKEN_ADDRESS, GOVERNANCE_TOKEN_ABI, provider);
      const balance = await contract.balanceOf(address);
      const formattedBalance = ethers.formatEther(balance);
      
      console.log('💰 Token balance:', formattedBalance, 'FDAO');
      return formattedBalance;
    } catch (error: any) {
      console.error('❌ Error getting token balance:', error);
      return '0';
    }
  };

  const stakeTokens = async (amount: string): Promise<boolean> => {
    try {
      const contract = getGovernanceTokenContract();
      const tx = await contract.stake(ethers.parseEther(amount));
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error staking tokens:', error);
      return false;
    }
  };

  const unstakeTokens = async (amount: string): Promise<boolean> => {
    try {
      const contract = getGovernanceTokenContract();
      const tx = await contract.unstake(ethers.parseEther(amount));
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      return false;
    }
  };

  const getStakeInfo = async (address: string): Promise<StakeInfo | null> => {
    try {
      const contract = getGovernanceTokenContract();
      const info = await contract.getStakeInfo(address);
      return {
        amount: ethers.formatEther(info[0]),
        timestamp: Number(info[1]),
        rewards: ethers.formatEther(info[2]),
      };
    } catch (error) {
      console.error('Error getting stake info:', error);
      return null;
    }
  };

  const claimRewards = async (): Promise<boolean> => {
    try {
      const contract = getGovernanceTokenContract();
      const tx = await contract.claimRewards();
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error claiming rewards:', error);
      return false;
    }
  };

  // Job operations
  const createJob = async (
    title: string,
    description: string,
    category: string,
    budget: string,
    paymentToken: string,
    deadline: number,
    metadataHash: string,
    skillIds: number[],
    skillLevels: number[]
  ): Promise<string | null> => {
    try {
      console.log('🚀 Creating job with parameters:', {
        title,
        budget,
        deadline: new Date(deadline * 1000)
      });
      
      const contract = getFreelanceJobContract();
      
      // Create job without sending ETH (job creation just posts the job, payment happens later)
      const tx = await contract.createJob(
        title,
        description,
        category,
        ethers.parseEther(budget),
        paymentToken,
        deadline,
        metadataHash,
        skillIds,
        skillLevels
      );
      
      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);
      
      // Try to extract job ID from events
      let jobId = null;
      
      try {
        const jobCreatedEvent = receipt.logs.find((log: any) => {
          try {
            const decoded = contract.interface.parseLog(log);
            return decoded?.name === 'JobCreated';
          } catch {
            return false;
          }
        });
        
        if (jobCreatedEvent) {
          const decoded = contract.interface.parseLog(jobCreatedEvent);
          jobId = decoded?.args[0].toString();
          console.log('📋 Job ID from event:', jobId);
        }
      } catch (eventError) {
        console.log('⚠️ Event parsing failed, will get job ID from contract');
      }
      
      // Fallback: Get the latest job ID from contract if event parsing failed
      if (!jobId) {
        try {
          const totalJobs = await contract.totalJobs();
          jobId = totalJobs.toString();
          console.log('📋 Job ID from totalJobs:', jobId);
        } catch (fallbackError) {
          console.log('⚠️ Fallback failed, using nextJobId');
          try {
            const nextJobId = await contract.nextJobId();
            jobId = (Number(nextJobId) - 1).toString(); // nextJobId is always +1 of the last created job
            console.log('📋 Job ID from nextJobId:', jobId);
          } catch (nextIdError) {
            console.log('⚠️ All job ID retrieval methods failed');
          }
        }
      }
      
      if (jobId) {
        console.log('✅ Job created successfully with ID:', jobId);
        return jobId;
      } else {
        console.log('⚠️ Job created but could not retrieve job ID - transaction was successful');
        // Even if we can't get the ID, the job was created successfully
        return "created";
      }
      
    } catch (error) {
      console.error('❌ Error creating job:', error);
      throw error;
    }
  };

  const getJobDetails = async (jobId: string): Promise<Job | null> => {
    try {
      const contract = getFreelanceJobContract();
      const job = await contract.jobs(jobId);
      return {
        client: job[1],
        title: job[3],
        description: job[4],
        budget: ethers.formatEther(job[6]),
        paymentToken: job[7],
        status: Number(job[9]),
      };
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  };

  const getAllJobs = async (): Promise<Job[]> => {
    try {
      console.log('🔄 Loading all jobs from blockchain...');
      
      if (!provider) {
        throw new Error('Provider not available');
      }
      
      // Use provider instead of signer for read-only operations
      const contract = new ethers.Contract(FREELANCE_JOB_ADDRESS, FREELANCE_JOB_ABI, provider);
      const totalJobs = await contract.totalJobs();
      console.log('📊 Total jobs found:', Number(totalJobs));
      
      const jobs: Job[] = [];
      
      for (let i = 1; i <= Number(totalJobs); i++) {
        try {
          console.log(`📋 Loading job ${i}...`);
          const job = await contract.jobs(i);
          
          const jobData: Job = {
            id: i.toString(),
            client: job[1],
            title: job[3],
            description: job[4],
            category: job[5],
            budget: ethers.formatEther(job[6]),
            paymentToken: job[7],
            deadline: Number(job[8]),
            status: Number(job[9]),
            metadataHash: job[10],
          };
          
          console.log(`✅ Job ${i} loaded:`, jobData);
          jobs.push(jobData);
        } catch (error) {
          console.error(`❌ Error loading job ${i}:`, error);
        }
      }
      
      console.log('✅ All jobs loaded:', jobs);
      return jobs;
    } catch (error: any) {
      console.error('❌ Error getting all jobs:', error);
      throw new Error(`Failed to load jobs: ${error.message}`);
    }
  };

  const submitBid = async (
    jobId: string,
    bidAmount: string,
    deliveryTime: number,
    proposalHash: string,
    portfolioHash: string,
    stakeAmount: string
  ): Promise<boolean> => {
    try {
      if (!account) throw new Error('Wallet not connected');
      
      console.log('🔄 Submitting bid:', {
        jobId,
        bidAmount,
        deliveryTime,
        proposalHash,
        portfolioHash,
        stakeAmount,
        account
      });
      
      const contract = getFreelanceJobContract();
      
      // Convert to proper format
      const bidAmountWei = ethers.parseEther(bidAmount);
      const stakeAmountWei = ethers.parseEther(stakeAmount);
      
      console.log('💰 Transaction details:', {
        jobId: Number(jobId),
        bidAmountWei: bidAmountWei.toString(),
        deliveryTime,
        proposalHash,
        portfolioHash,
        stakeAmountWei: stakeAmountWei.toString(),
        valueToSend: stakeAmountWei.toString()
      });
      
      // First approve the contract to spend tokens for staking
      const tokenContract = new ethers.Contract(GOVERNANCE_TOKEN_ADDRESS, GOVERNANCE_TOKEN_ABI, signer);
      console.log('🔗 Approving token transfer for staking...');
      const approveTx = await tokenContract.approve(FREELANCE_JOB_ADDRESS, stakeAmountWei);
      await approveTx.wait();
      console.log('✅ Token approval completed');

      const tx = await contract.submitBid(
        Number(jobId),
        bidAmountWei,
        deliveryTime,
        proposalHash,
        portfolioHash,
        stakeAmountWei
        // No ETH value - stake is handled via token transfer
      );
      
      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Bid submitted successfully:', receipt.hash);
      
      return true;
    } catch (error: any) {
      console.error('❌ Error submitting bid:', error);
      throw new Error(`Failed to submit bid: ${error.message}`);
    }
  };

  const getJobBids = async (jobId: string): Promise<any[]> => {
    try {
      const contract = getFreelanceJobContract();
      const bids = await contract.getJobBids(jobId);
      return bids.map((bid: any) => ({
        freelancer: bid.freelancer,
        amount: ethers.formatEther(bid.amount),
        stakeAmount: ethers.formatEther(bid.stakeAmount),
        deliveryTime: Number(bid.deliveryTime),
        proposalHash: bid.proposalHash,
        status: Number(bid.status),
        submittedAt: Number(bid.submittedAt)
      }));
    } catch (error) {
      console.error('Error getting job bids:', error);
      return [];
    }
  };

  const selectFreelancer = async (jobId: string, freelancer: string): Promise<boolean> => {
    try {
      const contract = getFreelanceJobContract();
      const tx = await contract.selectFreelancer(jobId, freelancer);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error selecting freelancer:', error);
      return false;
    }
  };

  const submitWork = async (jobId: string, workHash: string): Promise<boolean> => {
    try {
      const contract = getFreelanceJobContract();
      const tx = await contract.submitWork(jobId, workHash);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error submitting work:', error);
      return false;
    }
  };

  const approveWork = async (jobId: string): Promise<boolean> => {
    try {
      const contract = getFreelanceJobContract();
      const tx = await contract.approveWork(jobId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error approving work:', error);
      return false;
    }
  };

  // Escrow operations
  const getEscrowDetails = async (escrowId: string): Promise<any> => {
    try {
      const contract = getEscrowManagerContract();
      const escrow = await contract.getEscrowDetails(escrowId);
      return {
        jobId: Number(escrow[0]),
        client: escrow[1],
        freelancer: escrow[2],
        paymentToken: escrow[3],
        amount: ethers.formatEther(escrow[4]),
        status: Number(escrow[5]),
      };
    } catch (error) {
      console.error('Error getting escrow details:', error);
      return null;
    }
  };

  // Utility functions
  const formatEther = (wei: string): string => {
    return ethers.formatEther(wei);
  };

  const parseEther = (ether: string): string => {
    return ethers.parseEther(ether).toString();
  };

  const contextValue: Web3ContextType = {
    isConnected,
    account,
    chainId,
    balance,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getUserProfile,
    isUserRegistered,
    registerUser,
    updateProfile,
    getTokenBalance,
    stakeTokens,
    unstakeTokens,
    getStakeInfo,
    claimRewards,
    createJob,
    getJobDetails,
    getAllJobs,
    submitBid,
    getJobBids,
    selectFreelancer,
    submitWork,
    approveWork,
    getEscrowDetails,
    formatEther,
    parseEther,
  };

  return <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>;
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export default Web3Context;