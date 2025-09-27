# Backend API Documentation

## 🏗️ Architecture Overview

The backend serves as a bridge between the frontend and blockchain, providing caching, real-time features, user management, and IPFS integration.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   API Gateway   │◄──►│   Services      │
│   (Next.js)     │    │   (Express)     │    │                 │
└─────────────────┘    └─────────────────┘    │ • Auth Service  │
                                │              │ • Job Service   │
                                │              │ • User Service  │
┌─────────────────┐    ┌─────────────────┐    │ • IPFS Service  │
│   WebSocket     │◄──►│   Socket.io     │    │ • Notification  │
│   Clients       │    │   Server        │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │◄──►│   Prisma ORM    │    │     Redis       │
│   Database      │    │                 │    │     Cache       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Real-time**: Socket.io

### Additional Libraries
- **Authentication**: Passport.js, SIWE
- **Validation**: Zod
- **File Upload**: Multer, IPFS
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet, CORS
- **Monitoring**: Winston, Sentry

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/           # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── job.controller.ts
│   │   ├── user.controller.ts
│   │   ├── proposal.controller.ts
│   │   ├── contract.controller.ts
│   │   └── upload.controller.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/               # Prisma models
│   │   └── index.ts
│   ├── routes/               # API routes
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── jobs.routes.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   ├── proposals.routes.ts
│   │   │   │   └── contracts.routes.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── services/             # Business logic
│   │   ├── auth.service.ts
│   │   ├── job.service.ts
│   │   ├── user.service.ts
│   │   ├── blockchain.service.ts
│   │   ├── ipfs.service.ts
│   │   ├── notification.service.ts
│   │   └── analytics.service.ts
│   ├── utils/                # Utility functions
│   │   ├── crypto.utils.ts
│   │   ├── validation.utils.ts
│   │   ├── response.utils.ts
│   │   └── blockchain.utils.ts
│   ├── types/                # TypeScript types
│   │   ├── auth.types.ts
│   │   ├── job.types.ts
│   │   └── api.types.ts
│   ├── config/               # Configuration
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   ├── websocket/            # Socket.io handlers
│   │   ├── index.ts
│   │   ├── auth.socket.ts
│   │   ├── job.socket.ts
│   │   └── notification.socket.ts
│   ├── scripts/              # Utility scripts
│   │   ├── seed.ts
│   │   └── migrate.ts
│   ├── app.ts                # Express app setup
│   └── server.ts             # Server entry point
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── package.json
└── tsconfig.json
```

## 🗄️ Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String   @id @default(cuid())
  walletAddress     String   @unique
  nonce             String?
  profileHash       String?
  name              String?
  email             String?
  bio               String?
  avatar            String?
  userType          UserType @default(BOTH)
  reputation        Float    @default(0)
  totalJobs         Int      @default(0)
  successfulJobs    Int      @default(0)
  totalEarnings     Decimal  @default(0) @db.Decimal(18, 8)
  isVerified        Boolean  @default(false)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  jobsAsClient      Job[]           @relation("ClientJobs")
  jobsAsFreelancer  Job[]           @relation("FreelancerJobs")
  proposals         Proposal[]
  skills            UserSkill[]
  reviews           Review[]        @relation("ReviewsReceived")
  reviewsGiven      Review[]        @relation("ReviewsGiven")
  notifications     Notification[]
  contracts         Contract[]
  disputes          Dispute[]       @relation("DisputeParticipant")
  arbitrations      Dispute[]       @relation("DisputeArbitrator")

  @@map("users")
}

enum UserType {
  CLIENT
  FREELANCER
  BOTH
}

model Job {
  id               String     @id @default(cuid())
  blockchainId     BigInt?    @unique
  title            String
  description      String
  category         String
  budget           Decimal    @db.Decimal(18, 8)
  paymentToken     String     @default("0x0000000000000000000000000000000000000000")
  deadline         DateTime
  status           JobStatus  @default(OPEN)
  ipfsHash         String?
  clientId         String
  freelancerId     String?
  escrowReleased   Boolean    @default(false)
  completedAt      DateTime?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  // Relations
  client           User       @relation("ClientJobs", fields: [clientId], references: [id])
  freelancer       User?      @relation("FreelancerJobs", fields: [freelancerId], references: [id])
  proposals        Proposal[]
  skills           JobSkill[]
  attachments      Attachment[]
  contract         Contract?
  dispute          Dispute?
  milestones       Milestone[]

  @@map("jobs")
}

enum JobStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  SUBMITTED
  COMPLETED
  DISPUTED
  CANCELLED
}

model Proposal {
  id             String    @id @default(cuid())
  jobId          String
  freelancerId   String
  amount         Decimal   @db.Decimal(18, 8)
  deliveryTime   Int       // days
  coverLetter    String
  portfolioItems Json?
  stakedAmount   Decimal   @db.Decimal(18, 8)
  status         ProposalStatus @default(PENDING)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  job            Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  freelancer     User      @relation(fields: [freelancerId], references: [id])

  @@unique([jobId, freelancerId])
  @@map("proposals")
}

enum ProposalStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}

model Contract {
  id               String        @id @default(cuid())
  jobId            String        @unique
  clientId         String
  freelancerId     String
  amount           Decimal       @db.Decimal(18, 8)
  paymentToken     String
  startDate        DateTime
  endDate          DateTime
  status           ContractStatus @default(ACTIVE)
  escrowAddress    String?
  terms            String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  // Relations
  job              Job           @relation(fields: [jobId], references: [id])
  client           User          @relation(fields: [clientId], references: [id])
  milestones       Milestone[]
  payments         Payment[]

  @@map("contracts")
}

enum ContractStatus {
  ACTIVE
  COMPLETED
  CANCELLED
  DISPUTED
}

model Milestone {
  id           String          @id @default(cuid())
  contractId   String
  jobId        String
  title        String
  description  String
  amount       Decimal         @db.Decimal(18, 8)
  dueDate      DateTime
  status       MilestoneStatus @default(PENDING)
  completedAt  DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  // Relations
  contract     Contract        @relation(fields: [contractId], references: [id])
  job          Job             @relation(fields: [jobId], references: [id])
  payment      Payment?

  @@map("milestones")
}

enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  APPROVED
  DISPUTED
}

model Payment {
  id            String        @id @default(cuid())
  contractId    String
  milestoneId   String?       @unique
  amount        Decimal       @db.Decimal(18, 8)
  paymentToken  String
  txHash        String?
  status        PaymentStatus @default(PENDING)
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  contract      Contract      @relation(fields: [contractId], references: [id])
  milestone     Milestone?    @relation(fields: [milestoneId], references: [id])

  @@map("payments")
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

model Dispute {
  id              String        @id @default(cuid())
  jobId           String        @unique
  raisedBy        String
  reason          String
  description     String
  status          DisputeStatus @default(OPEN)
  evidence        Json?
  arbitrators     String[]
  votes           Json?
  resolution      String?
  resolvedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  job             Job           @relation(fields: [jobId], references: [id])
  participant     User          @relation("DisputeParticipant", fields: [raisedBy], references: [id])

  @@map("disputes")
}

enum DisputeStatus {
  OPEN
  VOTING
  RESOLVED
  APPEALED
}

model Review {
  id           String   @id @default(cuid())
  fromUserId   String
  toUserId     String
  jobId        String?
  rating       Int      @db.SmallInt
  comment      String?
  isPublic     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  fromUser     User     @relation("ReviewsGiven", fields: [fromUserId], references: [id])
  toUser       User     @relation("ReviewsReceived", fields: [toUserId], references: [id])

  @@unique([fromUserId, toUserId, jobId])
  @@map("reviews")
}

model Skill {
  id          String      @id @default(cuid())
  name        String      @unique
  category    String
  description String?
  createdAt   DateTime    @default(now())

  // Relations
  userSkills  UserSkill[]
  jobSkills   JobSkill[]

  @@map("skills")
}

model UserSkill {
  id        String @id @default(cuid())
  userId    String
  skillId   String
  level     Int    @db.SmallInt // 1-5
  verified  Boolean @default(false)

  // Relations
  user      User   @relation(fields: [userId], references: [id])
  skill     Skill  @relation(fields: [skillId], references: [id])

  @@unique([userId, skillId])
  @@map("user_skills")
}

model JobSkill {
  id      String @id @default(cuid())
  jobId   String
  skillId String

  // Relations
  job     Job    @relation(fields: [jobId], references: [id], onDelete: Cascade)
  skill   Skill  @relation(fields: [skillId], references: [id])

  @@unique([jobId, skillId])
  @@map("job_skills")
}

model Attachment {
  id          String      @id @default(cuid())
  jobId       String?
  filename    String
  originalName String
  mimeType    String
  size        Int
  ipfsHash    String
  url         String
  uploadedBy  String
  createdAt   DateTime    @default(now())

  // Relations
  job         Job?        @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@map("attachments")
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  data      Json?
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  // Relations
  user      User             @relation(fields: [userId], references: [id])

  @@map("notifications")
}

enum NotificationType {
  JOB_CREATED
  PROPOSAL_RECEIVED
  PROPOSAL_ACCEPTED
  PROPOSAL_REJECTED
  WORK_SUBMITTED
  WORK_APPROVED
  PAYMENT_RELEASED
  DISPUTE_RAISED
  DISPUTE_RESOLVED
  MESSAGE_RECEIVED
  SYSTEM_UPDATE
}

model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String?
  parentId    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  // Relations
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")

  @@map("categories")
}
```

## 🛣️ API Routes

### Authentication Routes

```typescript
// routes/api/v1/auth.routes.ts
import { Router } from 'express';
import { authController } from '../../../controllers/auth.controller';
import { validateRequest } from '../../../middleware/validation.middleware';
import { authSchemas } from '../../../schemas/auth.schemas';

const router = Router();

/**
 * @route   POST /api/v1/auth/nonce
 * @desc    Get nonce for wallet authentication
 * @access  Public
 */
router.post('/nonce', 
  validateRequest(authSchemas.nonceSchema),
  authController.getNonce
);

/**
 * @route   POST /api/v1/auth/verify
 * @desc    Verify signature and authenticate user
 * @access  Public
 */
router.post('/verify',
  validateRequest(authSchemas.verifySchema),
  authController.verifySignature
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Private
 */
router.post('/refresh',
  validateRequest(authSchemas.refreshSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authController.logout
);

export default router;
```

### Job Routes

```typescript
// routes/api/v1/jobs.routes.ts
import { Router } from 'express';
import { jobController } from '../../../controllers/job.controller';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { jobSchemas } from '../../../schemas/job.schemas';

const router = Router();

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all jobs with filters
 * @access  Public
 */
router.get('/',
  validateRequest(jobSchemas.getJobsSchema),
  jobController.getJobs
);

/**
 * @route   POST /api/v1/jobs
 * @desc    Create a new job
 * @access  Private (Client)
 */
router.post('/',
  authMiddleware,
  validateRequest(jobSchemas.createJobSchema),
  jobController.createJob
);

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job by ID
 * @access  Public
 */
router.get('/:id',
  validateRequest(jobSchemas.getJobSchema),
  jobController.getJob
);

/**
 * @route   PUT /api/v1/jobs/:id
 * @desc    Update job
 * @access  Private (Job Owner)
 */
router.put('/:id',
  authMiddleware,
  validateRequest(jobSchemas.updateJobSchema),
  jobController.updateJob
);

/**
 * @route   DELETE /api/v1/jobs/:id
 * @desc    Delete job
 * @access  Private (Job Owner)
 */
router.delete('/:id',
  authMiddleware,
  jobController.deleteJob
);

/**
 * @route   POST /api/v1/jobs/:id/proposals
 * @desc    Submit proposal for job
 * @access  Private (Freelancer)
 */
router.post('/:id/proposals',
  authMiddleware,
  validateRequest(jobSchemas.createProposalSchema),
  jobController.submitProposal
);

/**
 * @route   GET /api/v1/jobs/:id/proposals
 * @desc    Get job proposals
 * @access  Private (Job Owner)
 */
router.get('/:id/proposals',
  authMiddleware,
  jobController.getJobProposals
);

/**
 * @route   POST /api/v1/jobs/:id/select-freelancer
 * @desc    Select freelancer for job
 * @access  Private (Job Owner)
 */
router.post('/:id/select-freelancer',
  authMiddleware,
  validateRequest(jobSchemas.selectFreelancerSchema),
  jobController.selectFreelancer
);

export default router;
```

### User Routes

```typescript
// routes/api/v1/users.routes.ts
import { Router } from 'express';
import { userController } from '../../../controllers/user.controller';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { userSchemas } from '../../../schemas/user.schemas';

const router = Router();

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  authMiddleware,
  userController.getProfile
);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authMiddleware,
  validateRequest(userSchemas.updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id',
  userController.getUserById
);

/**
 * @route   GET /api/v1/users/:id/reviews
 * @desc    Get user reviews
 * @access  Public
 */
router.get('/:id/reviews',
  validateRequest(userSchemas.getUserReviewsSchema),
  userController.getUserReviews
);

/**
 * @route   POST /api/v1/users/:id/review
 * @desc    Create user review
 * @access  Private
 */
router.post('/:id/review',
  authMiddleware,
  validateRequest(userSchemas.createReviewSchema),
  userController.createReview
);

export default router;
```

## 🏗️ Service Layer

### Authentication Service

```typescript
// services/auth.service.ts
import { PrismaClient } from '@prisma/client';
import { generateNonce, SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';
import { AuthError } from '../utils/errors';

const prisma = new PrismaClient();

export class AuthService {
  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = generateNonce();
    
    // Update or create user with nonce
    await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: { nonce },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        nonce,
      },
    });

    return nonce;
  }

  async verifySignature(
    message: string,
    signature: string,
    walletAddress: string
  ): Promise<{ user: any; token: string; refreshToken: string }> {
    try {
      const siweMessage = new SiweMessage(message);
      const fields = await siweMessage.validate(signature);

      if (fields.address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new AuthError('Address mismatch');
      }

      // Get user and verify nonce
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        include: {
          skills: {
            include: { skill: true }
          }
        }
      });

      if (!user || user.nonce !== fields.nonce) {
        throw new AuthError('Invalid nonce');
      }

      // Clear nonce after successful verification
      await prisma.user.update({
        where: { id: user.id },
        data: { nonce: null },
      });

      // Generate tokens
      const token = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      return {
        user: this.sanitizeUser(user),
        token,
        refreshToken,
      };
    } catch (error) {
      throw new AuthError('Invalid signature');
    }
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }

  private sanitizeUser(user: any) {
    const { nonce, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = new AuthService();
```

### Job Service

```typescript
// services/job.service.ts
import { PrismaClient, Job, JobStatus } from '@prisma/client';
import { blockchainService } from './blockchain.service';
import { ipfsService } from './ipfs.service';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export class JobService {
  async createJob(userId: string, jobData: CreateJobData): Promise<Job> {
    // Upload metadata to IPFS
    const ipfsHash = await ipfsService.uploadJobMetadata({
      title: jobData.title,
      description: jobData.description,
      skills: jobData.skills,
      attachments: jobData.attachments,
    });

    // Create job in database
    const job = await prisma.job.create({
      data: {
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        budget: jobData.budget,
        paymentToken: jobData.paymentToken,
        deadline: jobData.deadline,
        ipfsHash,
        clientId: userId,
        skills: {
          create: jobData.skills.map(skillId => ({
            skillId,
          })),
        },
      },
      include: {
        client: true,
        skills: {
          include: { skill: true },
        },
      },
    });

    // Create job on blockchain
    try {
      const txHash = await blockchainService.createJob({
        title: job.title,
        description: job.description,
        category: job.category,
        budget: job.budget,
        paymentToken: job.paymentToken,
        deadline: job.deadline,
        ipfsHash,
      });

      // Update job with blockchain ID (we'll get this from event)
      // This will be handled by blockchain event listener
    } catch (error) {
      // Rollback database changes if blockchain fails
      await prisma.job.delete({ where: { id: job.id } });
      throw error;
    }

    return job;
  }

  async getJobs(filters: JobFilters): Promise<{
    jobs: Job[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      category,
      minBudget,
      maxBudget,
      skills,
      sortBy = 'newest',
      search,
    } = filters;

    const skip = (page - 1) * limit;

    const where = {
      status: JobStatus.OPEN,
      ...(category && { category }),
      ...(minBudget && { budget: { gte: minBudget } }),
      ...(maxBudget && { budget: { lte: maxBudget } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(skills?.length && {
        skills: {
          some: {
            skillId: { in: skills },
          },
        },
      }),
    };

    const orderBy = this.getOrderBy(sortBy);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              avatar: true,
              reputation: true,
            },
          },
          skills: {
            include: { skill: true },
          },
          _count: {
            select: { proposals: true },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async submitProposal(
    freelancerId: string,
    jobId: string,
    proposalData: CreateProposalData
  ): Promise<any> {
    // Check if job exists and is open
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { client: true },
    });

    if (!job || job.status !== JobStatus.OPEN) {
      throw new Error('Job not available for proposals');
    }

    // Check if user already submitted proposal
    const existingProposal = await prisma.proposal.findUnique({
      where: {
        jobId_freelancerId: {
          jobId,
          freelancerId,
        },
      },
    });

    if (existingProposal) {
      throw new Error('Proposal already submitted');
    }

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        jobId,
        freelancerId,
        amount: proposalData.amount,
        deliveryTime: proposalData.deliveryTime,
        coverLetter: proposalData.coverLetter,
        portfolioItems: proposalData.portfolioItems,
        stakedAmount: proposalData.stakedAmount,
      },
      include: {
        freelancer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            reputation: true,
          },
        },
      },
    });

    // Send notification to client
    await notificationService.createNotification({
      userId: job.clientId,
      type: 'PROPOSAL_RECEIVED',
      title: 'New Proposal Received',
      message: `${proposal.freelancer.name} submitted a proposal for "${job.title}"`,
      data: { jobId, proposalId: proposal.id },
    });

    return proposal;
  }

  private getOrderBy(sortBy: string) {
    switch (sortBy) {
      case 'newest':
        return { createdAt: 'desc' };
      case 'oldest':
        return { createdAt: 'asc' };
      case 'budget_high':
        return { budget: 'desc' };
      case 'budget_low':
        return { budget: 'asc' };
      case 'deadline':
        return { deadline: 'asc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}

export const jobService = new JobService();
```

### IPFS Service

```typescript
// services/ipfs.service.ts
import { create } from 'ipfs-http-client';
import pinataSDK from '@pinata/sdk';

export class IPFSService {
  private ipfs: any;
  private pinata: any;

  constructor() {
    this.ipfs = create({
      url: process.env.IPFS_URL || 'https://ipfs.infura.io:5001/api/v0',
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`
        ).toString('base64')}`,
      },
    });

    this.pinata = new pinataSDK(
      process.env.PINATA_API_KEY!,
      process.env.PINATA_SECRET_API_KEY!
    );
  }

  async uploadJobMetadata(metadata: any): Promise<string> {
    try {
      const result = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `job-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      });

      return result.IpfsHash;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }

  async uploadFile(file: Buffer, filename: string): Promise<string> {
    try {
      const result = await this.pinata.pinFileToIPFS(file, {
        pinataMetadata: {
          name: filename,
        },
      });

      return result.IpfsHash;
    } catch (error) {
      console.error('IPFS file upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async getMetadata(hash: string): Promise<any> {
    try {
      const response = await fetch(`${process.env.IPFS_GATEWAY_URL}/${hash}`);
      return await response.json();
    } catch (error) {
      console.error('IPFS fetch error:', error);
      throw new Error('Failed to fetch from IPFS');
    }
  }
}

export const ipfsService = new IPFSService();
```

## 🔌 WebSocket Implementation

```typescript
// websocket/index.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { authMiddleware } from './auth.socket';
import { jobHandlers } from './job.socket';
import { notificationHandlers } from './notification.socket';

export function initializeWebSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(authMiddleware);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user room for notifications
    socket.join(`user:${socket.userId}`);

    // Register event handlers
    jobHandlers(socket);
    notificationHandlers(socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
}
```

## 📊 Analytics Service

```typescript
// services/analytics.service.ts
export class AnalyticsService {
  async trackJobCreation(jobId: string, userId: string) {
    // Track job creation metrics
    await this.recordEvent('job_created', {
      jobId,
      userId,
      timestamp: new Date(),
    });
  }

  async trackProposalSubmission(proposalId: string, jobId: string, userId: string) {
    // Track proposal metrics
    await this.recordEvent('proposal_submitted', {
      proposalId,
      jobId,
      userId,
      timestamp: new Date(),
    });
  }

  async getDashboardStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        jobsAsClient: true,
        jobsAsFreelancer: true,
        proposals: true,
      },
    });

    return {
      totalJobs: user?.jobsAsClient.length || 0,
      activeJobs: user?.jobsAsClient.filter(job => 
        ['ASSIGNED', 'IN_PROGRESS'].includes(job.status)
      ).length || 0,
      completedJobs: user?.jobsAsClient.filter(job => 
        job.status === 'COMPLETED'
      ).length || 0,
      totalEarnings: user?.totalEarnings || 0,
      successRate: this.calculateSuccessRate(user),
    };
  }

  private calculateSuccessRate(user: any): number {
    if (!user?.totalJobs) return 0;
    return (user.successfulJobs / user.totalJobs) * 100;
  }

  private async recordEvent(event: string, data: any) {
    // Implement your analytics recording logic
    // Could be to a database, external service, etc.
  }
}

export const analyticsService = new AnalyticsService();
```

This comprehensive backend documentation provides everything needed to build a robust, scalable API that bridges Web2 and Web3 functionality for your freelancing platform.