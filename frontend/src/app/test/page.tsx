'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

// Contract ABIs and addresses
const FREELANCE_JOB_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
const USER_REGISTRY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'

const FREELANCE_JOB_ABI = [
  "function createJob(string calldata _title, string calldata _description, string calldata _category, uint256 _budget, address _paymentToken, uint256 _deadline, string calldata _metadataHash, uint256[] calldata _skillIds, uint256[] calldata _skillLevels) external returns (uint256)"
]

const USER_REGISTRY_ABI = [
  "function registerUser(uint8 _userType, string calldata _profileHash) external",
  "function users(address) external view returns (address, string, uint8, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)"
]

export default function TestPage() {
  const [account, setAccount] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [message, setMessage] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_requestAccounts', [])
        const signer = await provider.getSigner()
        
        setProvider(provider)
        setSigner(signer)
        setAccount(accounts[0])
        setIsConnected(true)
        setMessage(`Connected: ${accounts[0]}`)
        
        // Check if user is registered
        await checkUserRegistration(accounts[0])
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  const checkUserRegistration = async (userAddress: string) => {
    try {
      if (!provider) return
      
      const userRegistry = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider)
      const userData = await userRegistry.users(userAddress)
      
      console.log('User data from contract:', userData)
      
      // Check if userAddress field is not zero address (more reliable check)
      const registeredAddress = userData[0]
      const isRegistered = registeredAddress && registeredAddress.toLowerCase() === userAddress.toLowerCase()
      
      if (isRegistered) {
        setIsRegistered(true)
        setMessage(prev => prev + ' - User is ALREADY registered ✅ Ready to create jobs!')
        console.log('✅ Registration confirmed:', {
          address: userData[0],
          profileHash: userData[1], 
          userType: userData[2].toString()
        })
      } else {
        setIsRegistered(false)
        setMessage(prev => prev + ' - User NOT registered ❌')
        console.log('❌ User not registered')
      }
    } catch (error: any) {
      console.error('Error checking registration:', error)
      setMessage(prev => prev + ' - Error checking registration: ' + error.message)
    }
  }

  const registerUser = async () => {
    try {
      if (!signer) return
      
      setIsSubmitting(true)
      setMessage('Registering user...')
      
      const userRegistry = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, signer)
      const tx = await userRegistry.registerUser(2, 'QmTestProfile123') // UserType.Both = 2
      
      setMessage('Waiting for registration confirmation...')
      await tx.wait()
      
      setIsRegistered(true)
      setMessage('User registered successfully! ✅')
    } catch (error: any) {
      setMessage(`Registration failed: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const createTestJob = async () => {
    try {
      if (!signer || !isRegistered) return
      
      setIsSubmitting(true)
      setMessage('Creating job...')
      
      const freelanceJob = new ethers.Contract(FREELANCE_JOB_ADDRESS, FREELANCE_JOB_ABI, signer)
      
      const currentTime = Math.floor(Date.now() / 1000)
      const deadline = currentTime + (7 * 24 * 60 * 60) // 7 days from now
      
      const tx = await freelanceJob.createJob(
        'Test Job from Simple Form',
        'This is a test job created from the simple test page',
        'development',
        ethers.parseEther('0.1'), // 0.1 ETH
        '0x0000000000000000000000000000000000000000', // ETH payment
        deadline,
        'QmTestJobMetadata123',
        [1, 2], // skill IDs
        [3, 4]  // skill levels
      )
      
      setMessage('Waiting for job creation confirmation...')
      const receipt = await tx.wait()
      
      setMessage(`Job created successfully! 🎉 Transaction: ${receipt.hash}`)
    } catch (error: any) {
      setMessage(`Job creation failed: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">🧪 Simple Test Page</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Wallet Connection</h2>
        
        {!isConnected ? (
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect MetaMask
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-green-600 font-medium">✅ Wallet Connected</p>
            <p className="text-sm text-gray-600 font-mono">{account}</p>
            
            {!isRegistered ? (
              <div className="space-y-4">
                <p className="text-orange-600">⚠️ User not registered. Register first:</p>
                <button
                  onClick={registerUser}
                  disabled={isSubmitting}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register User'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-green-600">✅ User is registered</p>
                <button
                  onClick={createTestJob}
                  disabled={isSubmitting}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Job...' : 'Create Test Job'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {message && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold mb-2">Status:</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Click "Connect MetaMask" and connect with your address: <code className="bg-blue-100 px-1 rounded">0x2EF520FD7a7b96f450F25248d29DC3C4aB3432a2</code></li>
          <li>If "User NOT registered" appears, click "Register User"</li>
          <li>Once registered, click "Create Test Job"</li>
          <li>Confirm the transaction in MetaMask</li>
          <li>Success! 🎉</li>
        </ol>
      </div>

      {/* Network Info */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold mb-2">Network Configuration:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Network:</strong> Hardhat Local (Chain ID: 31337)</p>
          <p><strong>RPC URL:</strong> http://localhost:8545</p>
          <p><strong>FreelanceJob Contract:</strong> {FREELANCE_JOB_ADDRESS}</p>
          <p><strong>UserRegistry Contract:</strong> {USER_REGISTRY_ADDRESS}</p>
        </div>
      </div>
    </div>
  )
}