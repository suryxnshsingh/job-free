'use client'

import { useState } from 'react'
import { ethers } from 'ethers'

const USER_REGISTRY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
const FREELANCE_JOB_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [account, setAccount] = useState('')

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const connectAndTest = async () => {
    try {
      setLogs([])
      
      addLog('🔍 Starting connection test...')
      
      if (!(window as any).ethereum) {
        addLog('❌ MetaMask not found')
        return
      }
      
      addLog('✅ MetaMask detected')
      
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      addLog('✅ Provider created')
      
      const accounts = await provider.send('eth_requestAccounts', [])
      addLog(`✅ Accounts requested: ${accounts[0]}`)
      setAccount(accounts[0])
      
      const signer = await provider.getSigner()
      addLog('✅ Signer obtained')
      
      const network = await provider.getNetwork()
      addLog(`📡 Network: ${network.name} (${network.chainId})`)
      
      // Test direct contract call
      const userRegistryAbi = [
        'function users(address) external view returns (address, string, uint8, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)'
      ]
      
      const userRegistry = new ethers.Contract(USER_REGISTRY_ADDRESS, userRegistryAbi, provider)
      addLog('✅ UserRegistry contract created')
      
      const userData = await userRegistry.users(accounts[0])
      addLog(`📊 Raw contract data: ${JSON.stringify(userData)}`)
      
      const registeredAddress = userData[0]
      addLog(`🔍 Registered address: ${registeredAddress}`)
      addLog(`🔍 Connected address: ${accounts[0]}`)
      addLog(`🔍 Addresses match: ${registeredAddress.toLowerCase() === accounts[0].toLowerCase()}`)
      
      if (registeredAddress !== '0x0000000000000000000000000000000000000000') {
        addLog('✅ USER IS REGISTERED!')
        
        // Test job creation
        addLog('🚀 Testing job creation...')
        
        const jobAbi = [
          'function createJob(string calldata _title, string calldata _description, string calldata _category, uint256 _budget, address _paymentToken, uint256 _deadline, string calldata _metadataHash, uint256[] calldata _skillIds, uint256[] calldata _skillLevels) external returns (uint256)'
        ]
        
        const jobContract = new ethers.Contract(FREELANCE_JOB_ADDRESS, jobAbi, signer)
        addLog('✅ Job contract created')
        
        const currentTime = Math.floor(Date.now() / 1000)
        const deadline = currentTime + (7 * 24 * 60 * 60)
        
        addLog(`⏰ Current time: ${currentTime}, Deadline: ${deadline}`)
        
        const tx = await jobContract.createJob(
          'Debug Test Job',
          'Job created from debug page',
          'development',
          ethers.parseEther('0.1'),
          '0x0000000000000000000000000000000000000000',
          deadline,
          'QmDebugJob123',
          [1, 2],
          [3, 4]
        )
        
        addLog(`📝 Transaction sent: ${tx.hash}`)
        
        const receipt = await tx.wait()
        addLog(`🎉 JOB CREATED SUCCESSFULLY! Block: ${receipt.blockNumber}`)
        
      } else {
        addLog('❌ USER NOT REGISTERED')
      }
      
    } catch (error: any) {
      addLog(`💥 ERROR: ${error.message}`)
      if (error.data) {
        addLog(`💥 Error data: ${error.data}`)
      }
      console.error('Full error:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">🐛 Debug Page</h1>
      
      <div className="mb-6">
        <button
          onClick={connectAndTest}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 text-lg font-bold"
        >
          🔍 FULL DEBUG TEST
        </button>
      </div>

      {account && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-bold text-blue-900">Connected Account:</h3>
          <p className="font-mono text-sm">{account}</p>
        </div>
      )}

      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        <h3 className="text-white font-bold mb-2">Console Output:</h3>
        {logs.length === 0 ? (
          <p className="text-gray-400">Click the debug button to start...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">Expected Results:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Should detect MetaMask</li>
          <li>✅ Should connect to your address: 0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2</li>
          <li>✅ Should show "USER IS REGISTERED!"</li>
          <li>✅ Should successfully create a job</li>
        </ul>
      </div>
    </div>
  )
}