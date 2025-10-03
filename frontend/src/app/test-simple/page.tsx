'use client'

import { useState } from 'react'
import { ethers } from 'ethers'

const FREELANCE_JOB_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'

export default function TestSimplePage() {
  const [result, setResult] = useState('')

  const testDirectCall = async () => {
    try {
      setResult('Testing direct contract call...')
      
      if (!(window as any).ethereum) {
        setResult('❌ MetaMask not found')
        return
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      
      const abi = [
        'function createJob(string calldata _title, string calldata _description, string calldata _category, uint256 _budget, address _paymentToken, uint256 _deadline, string calldata _metadataHash, uint256[] calldata _skillIds, uint256[] calldata _skillLevels) external returns (uint256)'
      ]
      
      const contract = new ethers.Contract(FREELANCE_JOB_ADDRESS, abi, signer)
      
      const currentTime = Math.floor(Date.now() / 1000)
      const deadline = currentTime + (7 * 24 * 60 * 60)
      
      setResult('Sending transaction...')
      
      const tx = await contract.createJob(
        'Direct Test Job',
        'Testing direct contract call from browser',
        'development',
        ethers.parseEther('0.1'),
        '0x0000000000000000000000000000000000000000',
        deadline,
        'QmTestDirect123',
        [1, 2],
        [3, 4]
        // NO VALUE SENT - this should work
      )
      
      setResult(`Transaction sent: ${tx.hash}. Waiting for confirmation...`)
      
      const receipt = await tx.wait()
      setResult(`✅ SUCCESS! Job created in block ${receipt.blockNumber}`)
      
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`)
      console.error('Direct call error:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">🔬 Direct Contract Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testDirectCall}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 text-lg font-bold"
        >
          🔬 Test Direct Contract Call
        </button>
      </div>

      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
        <h3 className="text-white font-bold mb-2">Result:</h3>
        <p>{result || 'Click the button to test...'}</p>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">This test:</h3>
        <ul className="text-sm space-y-1">
          <li>• Bypasses all frontend Context/Provider code</li>
          <li>• Calls the contract directly with ethers.js</li>
          <li>• Uses the exact same parameters that work in Hardhat</li>
          <li>• Should reveal if the issue is in Web3Context or elsewhere</li>
        </ul>
      </div>
    </div>
  )
}