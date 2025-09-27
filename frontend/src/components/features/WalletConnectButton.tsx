'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WalletConnectButtonProps {
  className?: string
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isConnected, setIsConnected] = React.useState(false)
  const [address, setAddress] = React.useState<string>()

  const connectWallet = async () => {
    setIsConnecting(true)
    
    try {
      // Mock wallet connection for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsConnected(true)
      setAddress('0x1234...5678')
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAddress(undefined)
  }

  if (isConnected && address) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={disconnectWallet}
        className={cn("font-mono", className)}
      >
        {address}
      </Button>
    )
  }

  return (
    <Button
      variant="brand"
      size="sm"
      onClick={connectWallet}
      isLoading={isConnecting}
      className={className}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}