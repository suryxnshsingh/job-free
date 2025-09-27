# Testing & Security Documentation

## 🧪 Testing Strategy Overview

Our comprehensive testing strategy covers all layers of the application with appropriate test types, tools, and coverage metrics.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Unit Tests    │    │ Integration     │    │   E2E Tests     │
│                 │    │ Tests           │    │                 │
│ • Components    │    │ • API Routes    │    │ • User Flows    │
│ • Functions     │    │ • Database      │    │ • Cross-browser │
│ • Contracts     │    │ • Blockchain    │    │ • Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Security Tests  │
                    │                 │
                    │ • Penetration   │
                    │ • Smart Contract│
                    │ • Vulnerability │
                    └─────────────────┘
```

## 📊 Testing Coverage Goals

| Component | Unit Tests | Integration | E2E | Security |
|-----------|------------|-------------|-----|----------|
| Smart Contracts | 95%+ | 90%+ | 85%+ | 100% |
| Backend API | 90%+ | 85%+ | 80%+ | 95%+ |
| Frontend | 85%+ | 80%+ | 75%+ | 90%+ |

## 🔧 Smart Contract Testing

### Testing Framework Setup
```typescript
// contracts/test/setup.ts
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

export async function deployContractsFixture() {
  const [owner, client, freelancer, arbitrator1, arbitrator2, arbitrator3] = 
    await ethers.getSigners();

  // Deploy Governance Token
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy();

  // Deploy User Registry
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy(governanceToken.address);

  // Deploy Escrow Manager
  const EscrowManager = await ethers.getContractFactory("EscrowManager");
  const escrowManager = await EscrowManager.deploy();

  // Deploy Dispute Resolution
  const DisputeResolution = await ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(
    userRegistry.address,
    governanceToken.address
  );

  // Deploy Freelance Job
  const FreelanceJob = await ethers.getContractFactory("FreelanceJob");
  const freelanceJob = await FreelanceJob.deploy(
    userRegistry.address,
    escrowManager.address,
    disputeResolution.address
  );

  // Setup initial state
  await governanceToken.transfer(client.address, ethers.utils.parseEther("1000"));
  await governanceToken.transfer(freelancer.address, ethers.utils.parseEther("1000"));

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
  };
}
```

### Unit Tests for Smart Contracts

#### FreelanceJob Contract Tests
```typescript
// contracts/test/FreelanceJob.test.ts
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContractsFixture } from "./setup";

describe("FreelanceJob", function () {
  describe("Job Creation", function () {
    it("Should create a job successfully", async function () {
      const { freelanceJob, client } = await loadFixture(deployContractsFixture);

      const jobData = {
        title: "Build a DApp",
        description: "Need a React developer",
        category: "Development",
        budget: ethers.utils.parseEther("1"),
        paymentToken: ethers.constants.AddressZero,
        deadline: Math.floor(Date.now() / 1000) + 86400, // 1 day
        ipfsHash: "QmTest123...",
      };

      const tx = await freelanceJob.connect(client).createJob(
        jobData.title,
        jobData.description,
        jobData.category,
        jobData.budget,
        jobData.paymentToken,
        jobData.deadline,
        jobData.ipfsHash
      );

      await expect(tx)
        .to.emit(freelanceJob, "JobCreated")
        .withArgs(1, client.address, jobData.budget);

      const job = await freelanceJob.getJob(1);
      expect(job.title).to.equal(jobData.title);
      expect(job.client).to.equal(client.address);
      expect(job.budget).to.equal(jobData.budget);
      expect(job.status).to.equal(0); // JobStatus.Open
    });

    it("Should fail with invalid deadline", async function () {
      const { freelanceJob, client } = await loadFixture(deployContractsFixture);

      const pastDeadline = Math.floor(Date.now() / 1000) - 86400; // 1 day ago

      await expect(
        freelanceJob.connect(client).createJob(
          "Test Job",
          "Description",
          "Development",
          ethers.utils.parseEther("1"),
          ethers.constants.AddressZero,
          pastDeadline,
          "QmTest..."
        )
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("Should fail with zero budget", async function () {
      const { freelanceJob, client } = await loadFixture(deployContractsFixture);

      await expect(
        freelanceJob.connect(client).createJob(
          "Test Job",
          "Description",
          "Development",
          0,
          ethers.constants.AddressZero,
          Math.floor(Date.now() / 1000) + 86400,
          "QmTest..."
        )
      ).to.be.revertedWith("Budget must be greater than 0");
    });
  });

  describe("Proposal Submission", function () {
    beforeEach(async function () {
      const { freelanceJob, client } = await loadFixture(deployContractsFixture);
      
      // Create a job first
      await freelanceJob.connect(client).createJob(
        "Test Job",
        "Description",
        "Development",
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero,
        Math.floor(Date.now() / 1000) + 86400,
        "QmTest..."
      );
    });

    it("Should submit proposal successfully", async function () {
      const { freelanceJob, freelancer, governanceToken } = 
        await loadFixture(deployContractsFixture);

      // Approve token spending for staking
      const stakeAmount = ethers.utils.parseEther("100");
      await governanceToken.connect(freelancer).approve(freelanceJob.address, stakeAmount);

      const tx = await freelanceJob.connect(freelancer).submitBid(
        1, // jobId
        ethers.utils.parseEther("0.8"), // amount
        7, // deliveryTime in days
        "I'm perfect for this job!" // proposal
      );

      await expect(tx)
        .to.emit(freelanceJob, "BidSubmitted")
        .withArgs(1, freelancer.address, ethers.utils.parseEther("0.8"));

      const proposal = await freelanceJob.getBid(1, freelancer.address);
      expect(proposal.amount).to.equal(ethers.utils.parseEther("0.8"));
      expect(proposal.deliveryTime).to.equal(7);
      expect(proposal.isActive).to.be.true;
    });

    it("Should fail to submit proposal twice", async function () {
      const { freelanceJob, freelancer, governanceToken } = 
        await loadFixture(deployContractsFixture);

      const stakeAmount = ethers.utils.parseEther("100");
      await governanceToken.connect(freelancer).approve(freelanceJob.address, stakeAmount);

      // Submit first proposal
      await freelanceJob.connect(freelancer).submitBid(
        1,
        ethers.utils.parseEther("0.8"),
        7,
        "First proposal"
      );

      // Try to submit second proposal
      await expect(
        freelanceJob.connect(freelancer).submitBid(
          1,
          ethers.utils.parseEther("0.9"),
          5,
          "Second proposal"
        )
      ).to.be.revertedWith("Proposal already submitted");
    });
  });

  describe("Freelancer Selection", function () {
    beforeEach(async function () {
      const { freelanceJob, client, freelancer, governanceToken } = 
        await loadFixture(deployContractsFixture);
      
      // Create job and submit proposal
      await freelanceJob.connect(client).createJob(
        "Test Job",
        "Description",
        "Development",
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero,
        Math.floor(Date.now() / 1000) + 86400,
        "QmTest..."
      );

      const stakeAmount = ethers.utils.parseEther("100");
      await governanceToken.connect(freelancer).approve(freelanceJob.address, stakeAmount);
      
      await freelanceJob.connect(freelancer).submitBid(
        1,
        ethers.utils.parseEther("0.8"),
        7,
        "Great proposal"
      );
    });

    it("Should select freelancer successfully", async function () {
      const { freelanceJob, client, freelancer, escrowManager } = 
        await loadFixture(deployContractsFixture);

      const tx = await freelanceJob.connect(client).selectFreelancer(1, freelancer.address, {
        value: ethers.utils.parseEther("0.8")
      });

      await expect(tx)
        .to.emit(freelanceJob, "FreelancerSelected")
        .withArgs(1, freelancer.address);

      const job = await freelanceJob.getJob(1);
      expect(job.freelancer).to.equal(freelancer.address);
      expect(job.status).to.equal(1); // JobStatus.Assigned
    });

    it("Should fail if not job owner", async function () {
      const { freelanceJob, freelancer } = await loadFixture(deployContractsFixture);

      await expect(
        freelanceJob.connect(freelancer).selectFreelancer(1, freelancer.address, {
          value: ethers.utils.parseEther("0.8")
        })
      ).to.be.revertedWith("Only job client can select freelancer");
    });
  });

  describe("Work Submission and Approval", function () {
    beforeEach(async function () {
      // Setup complete job flow
      const { freelanceJob, client, freelancer, governanceToken } = 
        await loadFixture(deployContractsFixture);
      
      await freelanceJob.connect(client).createJob(
        "Test Job",
        "Description",
        "Development",
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero,
        Math.floor(Date.now() / 1000) + 86400,
        "QmTest..."
      );

      const stakeAmount = ethers.utils.parseEther("100");
      await governanceToken.connect(freelancer).approve(freelanceJob.address, stakeAmount);
      
      await freelanceJob.connect(freelancer).submitBid(
        1,
        ethers.utils.parseEther("0.8"),
        7,
        "Great proposal"
      );

      await freelanceJob.connect(client).selectFreelancer(1, freelancer.address, {
        value: ethers.utils.parseEther("0.8")
      });
    });

    it("Should submit work successfully", async function () {
      const { freelanceJob, freelancer } = await loadFixture(deployContractsFixture);

      const tx = await freelanceJob.connect(freelancer).submitWork(
        1,
        "QmDeliverable123..."
      );

      await expect(tx)
        .to.emit(freelanceJob, "WorkSubmitted")
        .withArgs(1, "QmDeliverable123...");

      const job = await freelanceJob.getJob(1);
      expect(job.status).to.equal(3); // JobStatus.Submitted
    });

    it("Should approve work and release payment", async function () {
      const { freelanceJob, client, freelancer } = await loadFixture(deployContractsFixture);

      // Submit work first
      await freelanceJob.connect(freelancer).submitWork(1, "QmDeliverable123...");

      const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

      const tx = await freelanceJob.connect(client).approveWork(1);

      await expect(tx)
        .to.emit(freelanceJob, "JobCompleted")
        .withArgs(1);

      const job = await freelanceJob.getJob(1);
      expect(job.status).to.equal(4); // JobStatus.Completed

      const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
      expect(freelancerBalanceAfter.sub(freelancerBalanceBefore))
        .to.equal(ethers.utils.parseEther("0.8"));
    });
  });

  describe("Dispute Resolution", function () {
    it("Should raise dispute successfully", async function () {
      const { freelanceJob, client, freelancer, disputeResolution } = 
        await loadFixture(deployContractsFixture);

      // Setup job and submit work
      // ... (setup code)

      const tx = await freelanceJob.connect(client).raiseDispute(
        1,
        "Work quality is not acceptable"
      );

      await expect(tx)
        .to.emit(freelanceJob, "DisputeRaised")
        .withArgs(1);

      const job = await freelanceJob.getJob(1);
      expect(job.status).to.equal(5); // JobStatus.Disputed
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for job creation", async function () {
      const { freelanceJob, client } = await loadFixture(deployContractsFixture);

      const tx = await freelanceJob.connect(client).createJob(
        "Gas Test Job",
        "Testing gas usage",
        "Development",
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero,
        Math.floor(Date.now() / 1000) + 86400,
        "QmGasTest..."
      );

      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(200000); // Reasonable gas limit
    });
  });
});
```

### Integration Tests for Smart Contracts
```typescript
// contracts/test/integration/JobLifecycle.test.ts
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployContractsFixture } from "../setup";

describe("Complete Job Lifecycle Integration", function () {
  it("Should complete full job lifecycle", async function () {
    const { 
      freelanceJob, 
      escrowManager, 
      userRegistry,
      governanceToken,
      client, 
      freelancer 
    } = await loadFixture(deployContractsFixture);

    // 1. Register users
    await userRegistry.connect(client).registerUser(0, "QmClientProfile..."); // CLIENT
    await userRegistry.connect(freelancer).registerUser(1, "QmFreelancerProfile..."); // FREELANCER

    // 2. Freelancer stakes tokens
    const stakeAmount = ethers.utils.parseEther("100");
    await governanceToken.connect(freelancer).approve(userRegistry.address, stakeAmount);
    await userRegistry.connect(freelancer).stakeTokens(stakeAmount);

    // 3. Client creates job
    const jobTx = await freelanceJob.connect(client).createJob(
      "Integration Test Job",
      "Complete job for testing",
      "Development",
      ethers.utils.parseEther("1"),
      ethers.constants.AddressZero,
      Math.floor(Date.now() / 1000) + 86400,
      "QmJobMetadata..."
    );

    // 4. Freelancer submits proposal
    await governanceToken.connect(freelancer).approve(freelanceJob.address, stakeAmount);
    await freelanceJob.connect(freelancer).submitBid(
      1,
      ethers.utils.parseEther("0.8"),
      7,
      "I can do this job perfectly!"
    );

    // 5. Client selects freelancer
    await freelanceJob.connect(client).selectFreelancer(1, freelancer.address, {
      value: ethers.utils.parseEther("0.8")
    });

    // 6. Verify escrow was created
    const escrow = await escrowManager.escrows(1);
    expect(escrow.amount).to.equal(ethers.utils.parseEther("0.8"));
    expect(escrow.client).to.equal(client.address);
    expect(escrow.freelancer).to.equal(freelancer.address);

    // 7. Freelancer submits work
    await freelanceJob.connect(freelancer).submitWork(1, "QmWorkDeliverable...");

    // 8. Client approves work
    const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
    await freelanceJob.connect(client).approveWork(1);

    // 9. Verify payment was released
    const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
    expect(freelancerBalanceAfter.sub(freelancerBalanceBefore))
      .to.equal(ethers.utils.parseEther("0.8"));

    // 10. Verify reputation was updated
    const freelancerProfile = await userRegistry.users(freelancer.address);
    expect(freelancerProfile.totalJobs).to.equal(1);
    expect(freelancerProfile.successfulJobs).to.equal(1);
  });

  it("Should handle dispute resolution flow", async function () {
    // Complex integration test for dispute resolution
    // Including arbitrator selection, voting, and resolution
  });
});
```

## 🖥️ Backend Testing

### API Testing Setup
```typescript
// backend/test/setup.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';

export async function setupTestApp(): Promise<{
  app: FastifyInstance;
  prisma: PrismaClient;
}> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
  
  const app = await createApp();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Clean database before each test
  await prisma.$executeRaw`TRUNCATE TABLE "users", "jobs", "proposals" RESTART IDENTITY CASCADE`;

  return { app, prisma };
}

export async function createTestUser(prisma: PrismaClient) {
  return await prisma.user.create({
    data: {
      walletAddress: '0x1234567890123456789012345678901234567890',
      name: 'Test User',
      email: 'test@example.com',
      userType: 'BOTH',
    },
  });
}

export function generateTestJWT(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}
```

### Unit Tests for API Endpoints
```typescript
// backend/test/routes/jobs.test.ts
import { test, beforeEach, afterEach } from 'tap';
import { setupTestApp, createTestUser, generateTestJWT } from '../setup';

test('Jobs API', async (t) => {
  const { app, prisma } = await setupTestApp();
  
  t.beforeEach(async () => {
    // Setup test data
  });

  t.afterEach(async () => {
    await app.close();
  });

  t.test('POST /api/v1/jobs - should create job successfully', async (t) => {
    const user = await createTestUser(prisma);
    const token = generateTestJWT(user.id);

    const jobData = {
      title: 'Test Job',
      description: 'This is a test job',
      category: 'Development',
      budget: 1000,
      paymentToken: '0x0000000000000000000000000000000000000000',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      skills: ['javascript', 'react'],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: jobData,
    });

    t.equal(response.statusCode, 201);
    
    const result = JSON.parse(response.payload);
    t.equal(result.title, jobData.title);
    t.equal(result.clientId, user.id);
    t.equal(result.status, 'OPEN');
  });

  t.test('GET /api/v1/jobs - should return jobs with filters', async (t) => {
    // Create test jobs
    const user = await createTestUser(prisma);
    await prisma.job.createMany({
      data: [
        {
          title: 'React Job',
          description: 'React development',
          category: 'Development',
          budget: 1000,
          paymentToken: '0x0000000000000000000000000000000000000000',
          deadline: new Date(Date.now() + 86400000),
          clientId: user.id,
        },
        {
          title: 'Design Job',
          description: 'UI/UX design',
          category: 'Design',
          budget: 500,
          paymentToken: '0x0000000000000000000000000000000000000000',
          deadline: new Date(Date.now() + 86400000),
          clientId: user.id,
        },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs?category=Development&minBudget=500',
    });

    t.equal(response.statusCode, 200);
    
    const result = JSON.parse(response.payload);
    t.equal(result.jobs.length, 1);
    t.equal(result.jobs[0].title, 'React Job');
  });

  t.test('POST /api/v1/jobs/:id/proposals - should submit proposal', async (t) => {
    const client = await createTestUser(prisma);
    const freelancer = await prisma.user.create({
      data: {
        walletAddress: '0x9876543210987654321098765432109876543210',
        name: 'Freelancer',
        userType: 'FREELANCER',
      },
    });

    const job = await prisma.job.create({
      data: {
        title: 'Test Job',
        description: 'Test description',
        category: 'Development',
        budget: 1000,
        paymentToken: '0x0000000000000000000000000000000000000000',
        deadline: new Date(Date.now() + 86400000),
        clientId: client.id,
      },
    });

    const token = generateTestJWT(freelancer.id);
    const proposalData = {
      amount: 800,
      deliveryTime: 7,
      coverLetter: 'I am perfect for this job!',
      portfolioItems: [
        { title: 'Portfolio Item 1', url: 'https://example.com/portfolio1' },
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${job.id}/proposals`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: proposalData,
    });

    t.equal(response.statusCode, 201);
    
    const result = JSON.parse(response.payload);
    t.equal(result.amount, proposalData.amount);
    t.equal(result.freelancerId, freelancer.id);
  });
});
```

### Integration Tests for Services
```typescript
// backend/test/services/job.service.test.ts
import { test, beforeEach } from 'tap';
import { PrismaClient } from '@prisma/client';
import { JobService } from '../../src/services/job.service';
import { createTestUser } from '../setup';

test('JobService Integration Tests', async (t) => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  const jobService = new JobService(prisma);

  t.beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "users", "jobs", "proposals" RESTART IDENTITY CASCADE`;
  });

  t.test('should create job with IPFS upload', async (t) => {
    const user = await createTestUser(prisma);
    
    const jobData = {
      title: 'Integration Test Job',
      description: 'Testing service integration',
      category: 'Development',
      budget: 1000,
      paymentToken: '0x0000000000000000000000000000000000000000',
      deadline: new Date(Date.now() + 86400000),
      skills: ['javascript'],
      attachments: [
        { filename: 'test.pdf', content: Buffer.from('test'), mimeType: 'application/pdf' },
      ],
    };

    const job = await jobService.createJob(user.id, jobData);

    t.ok(job.id);
    t.equal(job.title, jobData.title);
    t.ok(job.ipfsHash);
    t.equal(job.status, 'OPEN');
  });

  t.test('should handle proposal submission with validation', async (t) => {
    const client = await createTestUser(prisma);
    const freelancer = await prisma.user.create({
      data: {
        walletAddress: '0x9876543210987654321098765432109876543210',
        name: 'Freelancer',
        userType: 'FREELANCER',
      },
    });

    const job = await prisma.job.create({
      data: {
        title: 'Test Job',
        description: 'Test description',
        category: 'Development',
        budget: 1000,
        paymentToken: '0x0000000000000000000000000000000000000000',
        deadline: new Date(Date.now() + 86400000),
        clientId: client.id,
      },
    });

    const proposalData = {
      amount: 800,
      deliveryTime: 7,
      coverLetter: 'Great proposal',
      portfolioItems: [],
      stakedAmount: 100,
    };

    const proposal = await jobService.submitProposal(
      freelancer.id,
      job.id,
      proposalData
    );

    t.equal(proposal.amount, proposalData.amount);
    t.equal(proposal.freelancerId, freelancer.id);
    t.equal(proposal.status, 'PENDING');
  });
});
```

## 🌐 Frontend Testing

### Component Unit Tests
```typescript
// frontend/src/components/__tests__/JobCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobCard } from '../job/JobCard';
import { mockJob } from '../../__mocks__/job.mock';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('JobCard', () => {
  it('renders job information correctly', () => {
    render(
      <JobCard job={mockJob} showActions={true} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(mockJob.title)).toBeInTheDocument();
    expect(screen.getByText(mockJob.description)).toBeInTheDocument();
    expect(screen.getByText(mockJob.category)).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('handles save job action', async () => {
    const mockSaveJob = jest.fn();
    
    render(
      <JobCard 
        job={mockJob} 
        showActions={true}
        onSave={mockSaveJob}
      />,
      { wrapper: Wrapper }
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(mockSaveJob).toHaveBeenCalledWith(mockJob.id);
  });

  it('displays proposal count correctly', () => {
    const jobWithProposals = {
      ...mockJob,
      _count: { proposals: 5 },
    };

    render(
      <JobCard job={jobWithProposals} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('5 submitted')).toBeInTheDocument();
  });

  it('shows skills tags', () => {
    const jobWithSkills = {
      ...mockJob,
      skills: [
        { skill: { name: 'React' } },
        { skill: { name: 'TypeScript' } },
      ],
    };

    render(
      <JobCard job={jobWithSkills} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
});
```

### Hook Testing
```typescript
// frontend/src/hooks/__tests__/useJobs.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobs } from '../useJobs';
import { api } from '../../lib/api';

jest.mock('../../lib/api');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches jobs successfully', async () => {
    const mockJobs = {
      jobs: [{ id: '1', title: 'Test Job' }],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    (api.jobs.getJobs as jest.Mock).mockResolvedValue(mockJobs);

    const { result } = renderHook(() => useJobs(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockJobs);
    expect(api.jobs.getJobs).toHaveBeenCalledWith(undefined);
  });

  it('handles filters correctly', async () => {
    const filters = {
      category: 'Development',
      minBudget: 100,
      maxBudget: 1000,
    };

    const { result } = renderHook(() => useJobs(filters), { wrapper });

    await waitFor(() => {
      expect(api.jobs.getJobs).toHaveBeenCalledWith(filters);
    });
  });

  it('handles error state', async () => {
    (api.jobs.getJobs as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useJobs(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
```

### E2E Testing with Playwright
```typescript
// frontend/tests/e2e/job-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Job Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock MetaMask
    await page.addInitScript(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async (args) => {
          if (args.method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (args.method === 'personal_sign') {
            return '0xmocksignature';
          }
          return null;
        },
      };
    });

    await page.goto('/');
  });

  test('should create a job successfully', async ({ page }) => {
    // Connect wallet
    await page.click('[data-testid="connect-wallet"]');
    await page.click('[data-testid="metamask-option"]');
    
    // Navigate to job creation
    await page.click('[data-testid="post-job-button"]');
    await expect(page).toHaveURL('/jobs/create');

    // Fill job form
    await page.fill('[data-testid="job-title"]', 'E2E Test Job');
    await page.fill('[data-testid="job-description"]', 'This is an E2E test job description');
    await page.selectOption('[data-testid="job-category"]', 'Development');
    await page.fill('[data-testid="job-budget"]', '1000');
    
    // Set deadline
    await page.click('[data-testid="deadline-picker"]');
    await page.click('.react-datepicker__day--030'); // Select 30th day
    
    // Add skills
    await page.click('[data-testid="skills-input"]');
    await page.type('[data-testid="skills-input"]', 'React');
    await page.click('[data-testid="skill-react"]');
    
    // Submit job
    await page.click('[data-testid="submit-job"]');
    
    // Wait for blockchain transaction
    await expect(page.locator('[data-testid="transaction-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-success"]')).toBeVisible({
      timeout: 30000,
    });
    
    // Verify job was created
    await expect(page).toHaveURL(/\/job\/\d+/);
    await expect(page.locator('h1')).toContainText('E2E Test Job');
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('[data-testid="connect-wallet"]');
    await page.click('[data-testid="post-job-button"]');
    
    // Try to submit without filling required fields
    await page.click('[data-testid="submit-job"]');
    
    // Check validation errors
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required');
    await expect(page.locator('[data-testid="description-error"]')).toContainText('Description is required');
    await expect(page.locator('[data-testid="budget-error"]')).toContainText('Budget must be greater than 0');
  });
});

test.describe('Job Browse and Search', () => {
  test('should filter jobs by category', async ({ page }) => {
    await page.goto('/browse');
    
    // Select Development category
    await page.click('[data-testid="filter-category"]');
    await page.click('[data-testid="category-development"]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filter-development"]')).toBeVisible();
    
    // Check that only development jobs are shown
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards.first()).toBeVisible();
    
    for (const card of await jobCards.all()) {
      await expect(card.locator('[data-testid="job-category"]')).toContainText('Development');
    }
  });

  test('should search jobs by keywords', async ({ page }) => {
    await page.goto('/browse');
    
    // Search for React jobs
    await page.fill('[data-testid="search-input"]', 'React');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="search-results-count"]')).toContainText('React');
    
    const jobCards = page.locator('[data-testid="job-card"]');
    for (const card of await jobCards.all()) {
      const content = await card.textContent();
      expect(content?.toLowerCase()).toContain('react');
    }
  });
});
```

## 🔒 Security Testing

### Smart Contract Security Tests
```typescript
// contracts/test/security/SecurityTests.test.ts
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployContractsFixture } from "../setup";

describe("Security Tests", function () {
  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks on payment release", async function () {
      const { freelanceJob, client, freelancer } = await loadFixture(deployContractsFixture);

      // Deploy malicious contract that attempts reentrancy
      const MaliciousContract = await ethers.getContractFactory("MaliciousReentrancy");
      const maliciousContract = await MaliciousContract.deploy(freelanceJob.address);

      // Setup job with malicious contract as freelancer
      await freelanceJob.connect(client).createJob(
        "Test Job",
        "Description",
        "Development",
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero,
        Math.floor(Date.now() / 1000) + 86400,
        "QmTest..."
      );

      // The malicious contract should fail to exploit reentrancy
      await expect(
        maliciousContract.attemptReentrancy(1, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized job modifications", async function () {
      const { freelanceJob, client, freelancer } = await loadFixture(deployContractsFixture);

      await freelanceJob.connect(client).createJob(
        "Test Job",
        "Description",
        "Development",
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero,
        Math.floor(Date.now() / 1000) + 86400,
        "QmTest..."
      );

      // Freelancer should not be able to approve their own work
      await expect(
        freelanceJob.connect(freelancer).approveWork(1)
      ).to.be.revertedWith("Only job client can approve work");
    });

    it("Should prevent unauthorized fund withdrawals", async function () {
      const { escrowManager, client, freelancer } = await loadFixture(deployContractsFixture);

      // Setup escrow
      await escrowManager.connect(client).createEscrow(
        1,
        freelancer.address,
        ethers.constants.AddressZero,
        ethers.utils.parseEther("1"),
        { value: ethers.utils.parseEther("1") }
      );

      // Unauthorized user should not be able to release funds
      const [, , unauthorized] = await ethers.getSigners();
      await expect(
        escrowManager.connect(unauthorized).releaseFunds(1)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Integer Overflow/Underflow", function () {
    it("Should handle large numbers safely", async function () {
      const { freelanceJob, client } = await loadFixture(deployContractsFixture);

      const maxUint256 = ethers.constants.MaxUint256;

      // Should revert with overflow instead of wrapping
      await expect(
        freelanceJob.connect(client).createJob(
          "Test Job",
          "Description",
          "Development",
          maxUint256,
          ethers.constants.AddressZero,
          Math.floor(Date.now() / 1000) + 86400,
          "QmTest..."
        )
      ).to.be.revertedWith("Budget too large");
    });
  });

  describe("Front-running Protection", function () {
    it("Should prevent front-running of proposals", async function () {
      // Test commit-reveal scheme for proposal submission
      // This would require implementing a commit-reveal mechanism
    });
  });
});
```

### API Security Tests
```typescript
// backend/test/security/auth.security.test.ts
import { test } from 'tap';
import { setupTestApp } from '../setup';

test('Authentication Security Tests', async (t) => {
  const { app } = await setupTestApp();

  t.test('should prevent SQL injection', async (t) => {
    const maliciousPayload = {
      walletAddress: "'; DROP TABLE users; --",
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/nonce',
      payload: maliciousPayload,
    });

    // Should be handled safely by Prisma
    t.equal(response.statusCode, 400);
  });

  t.test('should rate limit authentication attempts', async (t) => {
    const payload = {
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    // Make multiple rapid requests
    const requests = Array(10).fill(null).map(() =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/nonce',
        payload,
      })
    );

    const responses = await Promise.all(requests);
    
    // Some requests should be rate limited
    const rateLimited = responses.filter(r => r.statusCode === 429);
    t.ok(rateLimited.length > 0, 'Rate limiting should be active');
  });

  t.test('should validate JWT tokens', async (t) => {
    const invalidToken = 'invalid.jwt.token';

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/profile',
      headers: {
        authorization: `Bearer ${invalidToken}`,
      },
    });

    t.equal(response.statusCode, 401);
  });

  t.test('should prevent CSRF attacks', async (t) => {
    // Test CSRF protection middleware
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://malicious-site.com',
      },
      payload: { title: 'Test' },
    });

    t.equal(response.statusCode, 403);
  });
});
```

### Penetration Testing Scripts
```bash
#!/bin/bash
# scripts/security-scan.sh

echo "🔒 Running Security Scans..."

# 1. Smart Contract Security
echo "📄 Scanning Smart Contracts..."
cd contracts

# Slither static analysis
slither . --exclude-dependencies

# Mythril symbolic execution
myth analyze contracts/FreelanceJob.sol --execution-timeout 300

# Echidna fuzzing (if tests exist)
# echidna-test contracts/FreelanceJob.sol --contract FreelanceJob

cd ..

# 2. Backend Security
echo "🖥️ Scanning Backend..."
cd backend

# npm audit for dependency vulnerabilities
npm audit --audit-level high

# Semgrep for code patterns
semgrep --config=auto src/

# OWASP ZAP API scan (requires running server)
# zap-api-scan.py -t http://localhost:5000/api/v1 -f openapi

cd ..

# 3. Frontend Security
echo "🌐 Scanning Frontend..."
cd frontend

# npm audit
npm audit --audit-level high

# ESLint security rules
npx eslint src/ --ext .ts,.tsx -c .eslintrc.security.js

cd ..

echo "✅ Security scans completed!"
```

## 📊 Performance Testing

### Load Testing with Artillery
```yaml
# performance/load-test.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
    - duration: 60
      arrivalRate: 15

scenarios:
  - name: "API Load Test"
    weight: 70
    flow:
      - get:
          url: "/api/v1/jobs"
      - think: 2
      - post:
          url: "/api/v1/auth/nonce"
          json:
            walletAddress: "0x{{ $randomString() }}"
      - think: 1
      - get:
          url: "/api/v1/jobs/{{ $randomInt(1, 100) }}"

  - name: "WebSocket Test"
    weight: 30
    engine: ws
    flow:
      - connect:
          target: "ws://localhost:5000"
      - send: '{"type": "join", "room": "user:{{ $randomString() }}"}'
      - think: 10
      - send: '{"type": "ping"}'
```

### Smart Contract Gas Testing
```typescript
// contracts/test/gas/GasUsage.test.ts
describe("Gas Usage Tests", function () {
  it("Should track gas usage for all operations", async function () {
    const { freelanceJob, client, freelancer } = await loadFixture(deployContractsFixture);

    const gasUsage: Record<string, number> = {};

    // Job creation gas
    const createTx = await freelanceJob.connect(client).createJob(
      "Gas Test Job",
      "Testing gas usage",
      "Development",
      ethers.utils.parseEther("1"),
      ethers.constants.AddressZero,
      Math.floor(Date.now() / 1000) + 86400,
      "QmTest..."
    );
    const createReceipt = await createTx.wait();
    gasUsage.jobCreation = createReceipt.gasUsed.toNumber();

    // Proposal submission gas
    await governanceToken.connect(freelancer).approve(freelanceJob.address, ethers.utils.parseEther("100"));
    const bidTx = await freelanceJob.connect(freelancer).submitBid(
      1,
      ethers.utils.parseEther("0.8"),
      7,
      "Gas test proposal"
    );
    const bidReceipt = await bidTx.wait();
    gasUsage.proposalSubmission = bidReceipt.gasUsed.toNumber();

    // Freelancer selection gas
    const selectTx = await freelanceJob.connect(client).selectFreelancer(1, freelancer.address, {
      value: ethers.utils.parseEther("0.8")
    });
    const selectReceipt = await selectTx.wait();
    gasUsage.freelancerSelection = selectReceipt.gasUsed.toNumber();

    // Work submission gas
    const submitTx = await freelanceJob.connect(freelancer).submitWork(1, "QmDeliverable...");
    const submitReceipt = await submitTx.wait();
    gasUsage.workSubmission = submitReceipt.gasUsed.toNumber();

    // Work approval gas
    const approveTx = await freelanceJob.connect(client).approveWork(1);
    const approveReceipt = await approveTx.wait();
    gasUsage.workApproval = approveReceipt.gasUsed.toNumber();

    console.log("Gas Usage Report:");
    console.table(gasUsage);

    // Assert reasonable gas limits
    expect(gasUsage.jobCreation).to.be.below(300000);
    expect(gasUsage.proposalSubmission).to.be.below(200000);
    expect(gasUsage.freelancerSelection).to.be.below(150000);
    expect(gasUsage.workSubmission).to.be.below(100000);
    expect(gasUsage.workApproval).to.be.below(100000);
  });
});
```

This comprehensive testing and security documentation ensures your blockchain freelancing platform is thoroughly tested, secure, and performant before deployment.