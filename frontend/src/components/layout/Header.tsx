'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WalletConnectButton } from '@/components/features/WalletConnectButton'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-xl">FreelanceDAO</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            href="/jobs" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Find Work
          </Link>
          <Link 
            href="/freelancers" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Find Talent
          </Link>
          <Link 
            href="/dashboard" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            href="/about" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <WalletConnectButton />
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-6 h-6 flex flex-col justify-center space-y-1">
            <span className={cn(
              "block h-0.5 w-6 bg-foreground transition-all duration-300",
              isMenuOpen && "rotate-45 translate-y-1.5"
            )} />
            <span className={cn(
              "block h-0.5 w-6 bg-foreground transition-all duration-300",
              isMenuOpen && "opacity-0"
            )} />
            <span className={cn(
              "block h-0.5 w-6 bg-foreground transition-all duration-300",
              isMenuOpen && "-rotate-45 -translate-y-1.5"
            )} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto py-4 px-4 space-y-4">
            <Link 
              href="/jobs" 
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Find Work
            </Link>
            <Link 
              href="/freelancers" 
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Find Talent
            </Link>
            <Link 
              href="/dashboard" 
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/about" 
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="pt-4 border-t space-y-3">
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Sign In
                </Button>
              </Link>
              <WalletConnectButton className="w-full" />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}