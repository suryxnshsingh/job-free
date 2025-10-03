import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'FreelanceDAO Backend'
  });
});

// API routes
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FreelanceDAO API is running',
    timestamp: new Date().toISOString()
  });
});

// Smart contract info endpoint
app.get('/api/v1/contracts', (req, res) => {
  res.json({
    contracts: {
      GovernanceToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      UserRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      EscrowManager: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      DisputeResolution: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      FreelanceJob: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
    },
    network: 'hardhat-local',
    chainId: 31337
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Contracts: http://localhost:${PORT}/api/v1/contracts`);
});