# Development Setup Guide

## 🛠️ Prerequisites

### System Requirements
- **Node.js**: v18.0+ (LTS recommended)
- **npm**: v8.0+ or **yarn**: v1.22+
- **Docker**: v20.0+ (for containerized services)
- **Git**: v2.30+

### Required Accounts & Keys
- **Alchemy/Infura**: Blockchain RPC endpoints
- **Pinata**: IPFS storage service
- **MetaMask**: For testing Web3 functionality

## 📦 Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-org/blockchain-freelancing-platform.git
cd blockchain-freelancing-platform
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install smart contract dependencies
cd contracts && npm install && cd ..
```

### 3. Environment Setup

#### Root Environment (.env)
```bash
# Copy example environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp contracts/.env.example contracts/.env
```

#### Backend Environment (backend/.env)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/freelance_platform"
DIRECT_URL="postgresql://username:password@localhost:5432/freelance_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# IPFS Configuration
IPFS_URL="https://ipfs.infura.io:5001/api/v0"
IPFS_PROJECT_ID="your-infura-project-id"
IPFS_PROJECT_SECRET="your-infura-project-secret"
IPFS_GATEWAY_URL="https://gateway.pinata.cloud/ipfs"

# Pinata Configuration
PINATA_API_KEY="your-pinata-api-key"
PINATA_SECRET_API_KEY="your-pinata-secret-key"

# Application
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Blockchain
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/your-key"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/your-key"
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-key"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

#### Frontend Environment (frontend/.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
NEXT_PUBLIC_WS_URL="http://localhost:5000"

# Blockchain Configuration
NEXT_PUBLIC_ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/your-key"
NEXT_PUBLIC_POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/your-key"
NEXT_PUBLIC_SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-key"

# Contract Addresses (will be populated after deployment)
NEXT_PUBLIC_FREELANCE_JOB_CONTRACT=""
NEXT_PUBLIC_ESCROW_MANAGER_CONTRACT=""
NEXT_PUBLIC_USER_REGISTRY_CONTRACT=""
NEXT_PUBLIC_DISPUTE_RESOLUTION_CONTRACT=""
NEXT_PUBLIC_GOVERNANCE_TOKEN_CONTRACT=""

# IPFS
NEXT_PUBLIC_IPFS_GATEWAY="https://gateway.pinata.cloud/ipfs"

# Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN="your-mixpanel-token"

# App Configuration
NEXT_PUBLIC_APP_NAME="FreelanceDAO"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### Contracts Environment (contracts/.env)
```env
# Private Keys (NEVER commit these)
PRIVATE_KEY="your-private-key-for-deployment"
DEPLOYER_PRIVATE_KEY="your-deployer-private-key"

# RPC URLs
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/your-key"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/your-key"
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-key"

# Etherscan API Keys
ETHERSCAN_API_KEY="your-etherscan-api-key"
POLYGONSCAN_API_KEY="your-polygonscan-api-key"

# Gas Configuration
GAS_PRICE="20000000000" # 20 gwei
GAS_LIMIT="6000000"

# Token Addresses (for mainnet deployment)
USDC_ADDRESS="0xA0b86a33E6aE3B6Bb60b5c2e9e2Eb6e7b3eE2d3"
USDT_ADDRESS="0xdAC17F958D2ee523a2206206994597C13D831ec7"
```

## 🗄️ Database Setup

### 1. Start PostgreSQL
```bash
# Using Docker
docker run --name freelance-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=username \
  -e POSTGRES_DB=freelance_platform \
  -p 5432:5432 \
  -d postgres:15

# Or install locally (macOS)
brew install postgresql
brew services start postgresql
createdb freelance_platform
```

### 2. Start Redis
```bash
# Using Docker
docker run --name freelance-redis \
  -p 6379:6379 \
  -d redis:alpine

# Or install locally (macOS)
brew install redis
brew services start redis
```

### 3. Run Database Migrations
```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

## 🔗 Smart Contract Setup

### 1. Compile Contracts
```bash
cd contracts
npx hardhat compile
```

### 2. Deploy to Local Network
```bash
# Start local hardhat network
npx hardhat node

# In another terminal, deploy contracts
npx hardhat run scripts/deploy.ts --network localhost
```

### 3. Deploy to Testnet (Sepolia)
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contracts
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

### 4. Update Contract Addresses
After deployment, update the contract addresses in:
- `frontend/.env.local`
- `backend/.env`
- `frontend/src/constants/contracts.ts`

## 🚀 Running the Application

### Development Mode (All Services)
```bash
# From root directory
npm run dev:all
```

This command starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Smart contracts: Local Hardhat network
- Database: PostgreSQL & Redis via Docker

### Individual Services

#### Frontend Only
```bash
cd frontend
npm run dev
```

#### Backend Only
```bash
cd backend
npm run dev
```

#### Smart Contracts Only
```bash
cd contracts
npx hardhat node
```

## 🔧 Development Tools

### Database Management
```bash
# Prisma Studio (Visual Database Browser)
cd backend
npx prisma studio
# Opens at http://localhost:5555

# Reset Database
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Smart Contract Development
```bash
# Hardhat Console
npx hardhat console --network localhost

# Run Tests
npx hardhat test

# Coverage Report
npx hardhat coverage

# Gas Report
REPORT_GAS=true npx hardhat test
```

### Code Quality Tools
```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Type check
npm run type-check

# Run all checks
npm run check:all
```

## 🐳 Docker Development

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild services
docker-compose up --build
```

### Docker Compose Configuration (docker-compose.yml)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: freelance_platform
      POSTGRES_USER: username
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://username:password@postgres:5432/freelance_platform
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

## 🧪 Testing Setup

### Frontend Testing
```bash
cd frontend

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Backend Testing
```bash
cd backend

# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Smart Contract Testing
```bash
cd contracts

# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/FreelanceJob.test.ts

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Generate coverage report
npx hardhat coverage
```

## 🔍 Debugging

### Frontend Debugging
```bash
# Enable debug mode
NEXT_PUBLIC_DEBUG=true npm run dev

# Debug with VS Code
# Create .vscode/launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug client-side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/frontend",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    }
  ]
}
```

### Backend Debugging
```bash
# Debug mode
npm run dev:debug

# VS Code debug configuration:
{
  "name": "Debug Backend",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/backend/src/server.ts",
  "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Smart Contract Debugging
```bash
# Debug with Hardhat console
npx hardhat console --network localhost

# Example debugging session:
> const Job = await ethers.getContractFactory("FreelanceJob")
> const job = await Job.attach("0x...")
> const result = await job.getJob(1)
> console.log(result)
```

## 📊 Performance Monitoring

### Application Metrics
```bash
# Install monitoring tools
npm install -g clinic

# Profile application
clinic doctor -- node backend/dist/server.js
clinic bubbleprof -- node backend/dist/server.js
clinic flame -- node backend/dist/server.js
```

### Database Performance
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check database connections
SELECT count(*) FROM pg_stat_activity;
```

## 🔒 Security Considerations

### Environment Security
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check for sensitive data in code
git secrets --scan
truffleHog --regex --entropy=False .
```

### Smart Contract Security
```bash
# Run security analysis
npm install -g mythril
myth analyze contracts/FreelanceJob.sol

# Run Slither
pip install slither-analyzer
slither contracts/
```

## 🚀 Production Deployment Preparation

### Build for Production
```bash
# Build all services
npm run build:all

# Test production builds locally
npm run start:prod
```

### Environment Variables for Production
```bash
# Generate production secrets
./scripts/generate-secrets.sh

# Validate environment
npm run validate:env
```

### Database Migration
```bash
# Create migration
npx prisma migrate dev --name add_new_feature

# Deploy to production
npx prisma migrate deploy
```

This comprehensive development guide provides everything needed to set up, run, and debug the blockchain freelancing platform in a development environment.