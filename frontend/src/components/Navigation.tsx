'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWeb3 } from '@/contexts/Web3Context';
import { useTheme } from '@/contexts/ThemeContext';

const Navigation: React.FC = () => {
  const { isConnected, account, connectWallet, disconnectWallet, balance } = useWeb3();
  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Browse Jobs', href: '/browse', icon: '🔍' },
    { name: 'My Jobs', href: '/jobs', icon: '💼' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'glass-strong backdrop-blur-xl border-b border-neutral-200/20 dark:border-neutral-700/20' 
        : 'bg-transparent'
    }`}>
      <div className="container-premium">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Award-winning design */}
          <Link href="/" className="flex items-center space-x-4 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 group-hover:rotate-12">
                <span className="text-white font-black text-xl">F</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            </div>
            <div className="hidden sm:block">
              <span className="text-2xl font-black bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
                FreelanceDAO
              </span>
              <div className="text-xs text-gradient-gold font-semibold tracking-wider uppercase">
                Zero Fees • Web3 Native
              </div>
            </div>
          </Link>

          {/* Desktop Navigation - Premium styling */}
          <div className="hidden lg:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  ${isActive(item.href)
                    ? 'text-white bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-300 shadow-lg'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-white/10 dark:hover:bg-neutral-800/50'
                  }
                `}
              >
                <span className="mr-2 text-lg">{item.icon}</span>
                {item.name}
                {isActive(item.href) && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-red-500/20 animate-pulse"></div>
                )}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle - Sophisticated */}
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 group"
              aria-label="Toggle theme"
            >
              <div className="relative">
                {isDark ? (
                  <svg className="w-5 h-5 transform group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 transform group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </div>
            </button>

            {/* Wallet Connection - Premium design */}
            {isConnected ? (
              <div className="flex items-center space-x-4">
                {/* Balance Display */}
                <div className="hidden md:flex flex-col items-end">
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {parseFloat(balance).toFixed(3)} ETH
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </div>
                </div>

                {/* Account Avatar - Sophisticated */}
                <div className="relative group">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-105 transition-transform duration-300">
                    {account?.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                </div>

                {/* Disconnect Button */}
                <div className="hidden xl:block">
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-premium btn-gold px-6 py-3 rounded-xl text-sm font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation - Premium overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 glass-strong border-t border-neutral-200/20 dark:border-neutral-700/20 animate-fade-in-up">
            <div className="container-premium py-6">
              <div className="space-y-3">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      block px-6 py-4 rounded-xl text-base font-semibold transition-all duration-300
                      ${isActive(item.href)
                        ? 'text-white bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-300 shadow-lg'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-white/10 dark:hover:bg-neutral-800/50'
                      }
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
                
                {isConnected && (
                  <div className="pt-4 border-t border-neutral-200/20 dark:border-neutral-700/20">
                    <div className="px-6 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="font-semibold">Balance: {parseFloat(balance).toFixed(3)} ETH</div>
                      <div className="text-xs">{account}</div>
                    </div>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-6 py-4 rounded-xl text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;