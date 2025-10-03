'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWeb3 } from '@/contexts/Web3Context'

interface WalletConnectButtonProps {
  className?: string
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { isConnected, account, connectWallet, disconnectWallet, chainId } = useWeb3()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (isConnected) {
      disconnectWallet()
      return
    }

    setIsConnecting(true)
    try {
      await connectWallet()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return 'Ethereum'
      case 11155111:
        return 'Sepolia'
      case 31337:
        return 'Hardhat'
      default:
        return 'Unknown'
    }
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        {chainId && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {getNetworkName(chainId)}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleConnect}
          className={cn("font-mono", className)}
        >
          {formatAddress(account)}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleConnect}
      disabled={isConnecting}
      className={className}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}