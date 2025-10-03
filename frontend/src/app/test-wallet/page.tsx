'use client';

import React from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function TestWalletPage() {
  const { isConnected, account, connectWallet, chainId, balance } = useWeb3();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Wallet Connection Test</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="space-y-2">
            <p><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Account:</strong> {account || 'Not connected'}</p>
            <p><strong>Chain ID:</strong> {chainId || 'Unknown'}</p>
            <p><strong>Balance:</strong> {balance || '0'} ETH</p>
          </div>
        </div>

        {!isConnected ? (
          <AnimatedButton
            variant="primary"
            size="lg"
            onClick={connectWallet}
          >
            Connect Wallet
          </AnimatedButton>
        ) : (
          <div className="text-green-600">
            ✅ Wallet connected successfully!
          </div>
        )}

        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Debug Information
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Check the browser console for detailed logs about the wallet connection process.
          </p>
        </div>
      </div>
    </div>
  );
}