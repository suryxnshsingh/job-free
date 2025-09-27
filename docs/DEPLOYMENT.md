# Deployment Guide

## 🚀 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Frontend  │    │   Load Balancer │    │   Smart         │
│   (Vercel)      │◄──►│   (Nginx)       │◄──►│   Contracts     │
└─────────────────┘    └─────────────────┘    │   (Ethereum)    │
                                │              └─────────────────┘
                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │◄──►│   Backend API   │    │   File Storage  │
│   (PostgreSQL)  │    │   (Docker)      │◄──►│   (IPFS/Pinata) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                        ┌─────────────────┐
                        │   Cache/Queue   │
                        │   (Redis)       │
                        └─────────────────┘
```

## 🌐 Infrastructure Options

### Option 1: Cloud Provider (Recommended)
- **Frontend**: Vercel/Netlify
- **Backend**: AWS ECS/DigitalOcean Apps/Railway
- **Database**: AWS RDS/DigitalOcean Managed Database
- **Cache**: AWS ElastiCache/Redis Cloud
- **Monitoring**: Sentry/DataDog

### Option 2: VPS Self-Hosted
- **Server**: DigitalOcean Droplet/Linode/Vultr
- **Container**: Docker Compose
- **Reverse Proxy**: Nginx/Traefik
- **SSL**: Let's Encrypt/Cloudflare

### Option 3: Kubernetes (Enterprise)
- **Orchestration**: AWS EKS/GKE/DigitalOcean Kubernetes
- **Ingress**: NGINX Ingress Controller
- **Database**: Cloud SQL/RDS
- **Monitoring**: Prometheus/Grafana

## 📋 Pre-Deployment Checklist

### Security Audit
- [ ] Smart contracts audited by professional auditor
- [ ] Environment variables secured
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection headers

### Performance Optimization
- [ ] Database indexes optimized
- [ ] Frontend assets optimized
- [ ] CDN configured
- [ ] Image optimization
- [ ] Bundle size analyzed
- [ ] Caching strategies implemented

### Monitoring Setup
- [ ] Error tracking (Sentry)
- [ ] Application monitoring (DataDog/New Relic)
- [ ] Database monitoring
- [ ] Uptime monitoring
- [ ] Log aggregation

## 🔗 Smart Contract Deployment

### 1. Mainnet Deployment Strategy

#### Environment Setup
```bash
# contracts/.env.production
PRIVATE_KEY="your-mainnet-deployer-private-key"
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/your-key"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/your-key"
ETHERSCAN_API_KEY="your-etherscan-api-key"
POLYGONSCAN_API_KEY="your-polygonscan-api-key"
```

#### Deployment Script
```typescript
// scripts/deploy-production.ts
import { ethers } from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  console.log("🚀 Starting production deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    throw new Error("Insufficient balance for deployment");
  }

  // Deploy contracts in dependency order
  const contracts = await deployContracts();
  
  // Verify contracts
  await verifyContracts(contracts);
  
  // Save contract addresses
  saveContractAddresses(contracts);
  
  console.log("✅ Production deployment completed!");
}

async function deployContracts() {
  const contracts: any = {};
  
  // 1. Deploy Governance Token
  console.log("📄 Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  contracts.governanceToken = await GovernanceToken.deploy();
  await contracts.governanceToken.deployed();
  console.log("✅ GovernanceToken deployed to:", contracts.governanceToken.address);
  
  // 2. Deploy User Registry
  console.log("📄 Deploying UserRegistry...");
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  contracts.userRegistry = await UserRegistry.deploy(contracts.governanceToken.address);
  await contracts.userRegistry.deployed();
  console.log("✅ UserRegistry deployed to:", contracts.userRegistry.address);
  
  // 3. Deploy Escrow Manager
  console.log("📄 Deploying EscrowManager...");
  const EscrowManager = await ethers.getContractFactory("EscrowManager");
  contracts.escrowManager = await EscrowManager.deploy();
  await contracts.escrowManager.deployed();
  console.log("✅ EscrowManager deployed to:", contracts.escrowManager.address);
  
  // 4. Deploy Dispute Resolution
  console.log("📄 Deploying DisputeResolution...");
  const DisputeResolution = await ethers.getContractFactory("DisputeResolution");
  contracts.disputeResolution = await DisputeResolution.deploy(
    contracts.userRegistry.address,
    contracts.governanceToken.address
  );
  await contracts.disputeResolution.deployed();
  console.log("✅ DisputeResolution deployed to:", contracts.disputeResolution.address);
  
  // 5. Deploy Freelance Job
  console.log("📄 Deploying FreelanceJob...");
  const FreelanceJob = await ethers.getContractFactory("FreelanceJob");
  contracts.freelanceJob = await FreelanceJob.deploy(
    contracts.userRegistry.address,
    contracts.escrowManager.address,
    contracts.disputeResolution.address
  );
  await contracts.freelanceJob.deployed();
  console.log("✅ FreelanceJob deployed to:", contracts.freelanceJob.address);
  
  return contracts;
}

async function verifyContracts(contracts: any) {
  console.log("🔍 Verifying contracts on Etherscan...");
  
  for (const [name, contract] of Object.entries(contracts)) {
    try {
      await hre.run("verify:verify", {
        address: (contract as any).address,
        constructorArguments: getConstructorArgs(name, contracts),
      });
      console.log(`✅ ${name} verified`);
    } catch (error) {
      console.error(`❌ Failed to verify ${name}:`, error);
    }
  }
}

function saveContractAddresses(contracts: any) {
  const addresses = Object.fromEntries(
    Object.entries(contracts).map(([name, contract]) => [
      name,
      (contract as any).address
    ])
  );
  
  writeFileSync(
    'deployments/mainnet.json',
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("📝 Contract addresses saved to deployments/mainnet.json");
}
```

#### Deploy to Networks
```bash
# Deploy to Ethereum Mainnet
npx hardhat run scripts/deploy-production.ts --network mainnet

# Deploy to Polygon
npx hardhat run scripts/deploy-production.ts --network polygon

# Verify contracts
npx hardhat verify --network mainnet CONTRACT_ADDRESS
```

## 🖥️ Backend Deployment

### 1. Docker Configuration

#### Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "start"]
```

#### Docker Compose (Production)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2. Cloud Deployment (Railway)

#### railway.toml
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "backend"

[services.variables]
NODE_ENV = "production"
PORT = "5000"

[[services]]
name = "postgres"
image = "postgres:15"

[services.variables]
POSTGRES_DB = "freelance_platform"
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = { type = "secret", name = "DATABASE_PASSWORD" }

[[services]]
name = "redis"
image = "redis:alpine"
```

#### Deployment Script
```bash
#!/bin/bash
# scripts/deploy-backend.sh

set -e

echo "🚀 Deploying Backend to Railway..."

# Build and push
railway login
railway link
railway up

# Run migrations
railway run npx prisma migrate deploy

# Seed database if needed
railway run npx prisma db seed

echo "✅ Backend deployment completed!"
```

### 3. AWS ECS Deployment

#### Task Definition
```json
{
  "family": "freelance-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/freelance-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/freelance-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## 🌐 Frontend Deployment

### 1. Vercel Deployment

#### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.freelancedao.com/api/v1",
    "NEXT_PUBLIC_WS_URL": "https://api.freelancedao.com"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

#### Deployment Script
```bash
#!/bin/bash
# scripts/deploy-frontend.sh

set -e

echo "🚀 Deploying Frontend to Vercel..."

# Install Vercel CLI
npm i -g vercel

# Build and deploy
cd frontend
vercel --prod

echo "✅ Frontend deployment completed!"
```

### 2. Netlify Deployment

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/api/*"
  to = "https://api.freelancedao.com/api/:splat"
  status = 200
  force = true
```

## 🔒 SSL/TLS Configuration

### Let's Encrypt with Nginx
```nginx
# nginx.conf
server {
    listen 80;
    server_name api.freelancedao.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.freelancedao.com;

    ssl_certificate /etc/letsencrypt/live/api.freelancedao.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.freelancedao.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate Automation
```bash
#!/bin/bash
# scripts/setup-ssl.sh

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.freelancedao.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring Setup

### 1. Application Monitoring

#### Sentry Configuration
```typescript
// utils/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
```

#### Health Check Endpoint
```typescript
// routes/health.ts
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    blockchain: await checkBlockchain(),
    ipfs: await checkIPFS(),
  };
  
  const isHealthy = Object.values(checks).every(Boolean);
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  });
});
```

### 2. Infrastructure Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'freelance-backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/metrics'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "FreelanceDAO Metrics",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds_bucket",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends"
          }
        ]
      }
    ]
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm ci
          cd frontend && npm ci
          cd ../backend && npm ci
          cd ../contracts && npm ci
      
      - name: Run tests
        run: npm run test:all
      
      - name: Build
        run: npm run build:all

  deploy-contracts:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd contracts && npm ci
      
      - name: Deploy contracts
        run: cd contracts && npx hardhat run scripts/deploy-production.ts --network mainnet
        env:
          PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
          ETHEREUM_RPC_URL: ${{ secrets.ETHEREUM_RPC_URL }}

  deploy-backend:
    needs: [test, deploy-contracts]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: [test, deploy-contracts]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          cd frontend && vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 🚨 Rollback Strategy

### Database Rollback
```bash
#!/bin/bash
# scripts/rollback-database.sh

BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Create backup before rollback
pg_dump $DATABASE_URL > $BACKUP_FILE

# Rollback to previous migration
npx prisma migrate reset

echo "Database rolled back. Backup saved as $BACKUP_FILE"
```

### Application Rollback
```bash
#!/bin/bash
# scripts/rollback-deployment.sh

# Vercel rollback
vercel rollback https://freelancedao.com

# Railway rollback
railway rollback

# Docker rollback
docker service update --rollback backend_service
```

This comprehensive deployment guide covers all aspects of deploying your blockchain freelancing platform to production, from smart contracts to monitoring and rollback strategies.