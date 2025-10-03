'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/contexts/Web3Context';
import { useTheme } from '@/contexts/ThemeContext';

const HomePage: React.FC = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { isDark } = useTheme();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: '⚡',
      title: 'ZERO FEES',
      description: 'Revolutionary blockchain technology eliminates traditional platform fees forever',
      gradient: 'from-yellow-400 via-orange-500 to-red-500'
    },
    {
      icon: '🔒',
      title: 'SMART ESCROW',
      description: 'Automated smart contracts ensure secure payments and dispute resolution',
      gradient: 'from-blue-400 via-purple-500 to-pink-500'
    },
    {
      icon: '🌍',
      title: 'GLOBAL NETWORK',
      description: 'Connect with world-class talent and clients across 195+ countries',
      gradient: 'from-green-400 via-blue-500 to-purple-600'
    },
    {
      icon: '🚀',
      title: 'INSTANT PAYMENTS',
      description: 'Get paid instantly in cryptocurrency or traditional currencies',
      gradient: 'from-pink-400 via-red-500 to-yellow-500'
    }
  ];

  const stats = [
    { value: '$2.4B+', label: 'TOTAL VOLUME', subtext: 'Processed through platform' },
    { value: '150K+', label: 'ACTIVE USERS', subtext: 'Growing daily' },
    { value: '99.9%', label: 'UPTIME', subtext: 'Blockchain reliability' },
    { value: '0%', label: 'PLATFORM FEES', subtext: 'Forever free' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Hero Section - Award-winning design */}
      <section className="relative min-h-screen flex items-center justify-center mesh-bg">
        {/* Animated Background Elements */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(234, 179, 8, 0.15) 0%, transparent 50%)`
          }}
        />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-600/20 animate-float-glow" />
        <div className="absolute bottom-32 right-32 w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 animate-float-glow delay-1000" />
        <div className="absolute top-1/2 left-32 w-16 h-16 rounded-full bg-gradient-to-r from-pink-400/20 to-red-500/20 animate-float-glow delay-2000" />

        <div className="container-premium relative z-10">
          <div className="text-center">
            {/* Main Headline - Award-winning typography */}
            <div className={`${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <h1 className="text-hero mb-8">
                THE FUTURE OF
                <br />
                <span className="text-gradient-gold animate-gradient-shift">FREELANCING</span>
              </h1>
            </div>

            {/* Subheadline */}
            <div className={`${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-neutral-600 dark:text-neutral-400 mb-12 max-w-4xl mx-auto leading-relaxed">
                Experience the <span className="text-gradient-mocha font-semibold">world's first</span> zero-fee freelancing platform powered by blockchain technology
              </p>
            </div>

            {/* CTA Buttons */}
            <div className={`${isLoaded ? 'animate-fade-in-up' : 'opacity-0'} flex flex-col sm:flex-row gap-6 justify-center items-center mb-16`} style={{ animationDelay: '400ms' }}>
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  className="btn-premium btn-gold px-12 py-6 rounded-2xl text-xl font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300"
                >
                  CONNECT WALLET
                </button>
              ) : (
                <Link
                  href="/browse"
                  className="btn-premium btn-gold px-12 py-6 rounded-2xl text-xl font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300 inline-block"
                >
                  START EARNING
                </Link>
              )}
              
              <Link
                href="/jobs"
                className="btn-premium px-12 py-6 rounded-2xl text-xl font-bold text-white transform hover:scale-105 transition-all duration-300"
              >
                POST A JOB
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className={`${isLoaded ? 'animate-fade-in-up' : 'opacity-0'} glass-strong rounded-3xl p-8 max-w-5xl mx-auto`} style={{ animationDelay: '600ms' }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="text-4xl lg:text-5xl font-black text-gradient-gold mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      {stat.label}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {stat.subtext}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-neutral-400 dark:border-neutral-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-neutral-400 dark:bg-neutral-600 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section - Premium design */}
      <section className="section-padding bg-white dark:bg-neutral-900 relative">
        <div className="container-premium">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-black text-neutral-900 dark:text-neutral-100 mb-6">
              REVOLUTIONARY
              <br />
              <span className="text-gradient-gold">FEATURES</span>
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Built on cutting-edge blockchain technology to deliver unprecedented value to freelancers and clients worldwide
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`card-luxury p-10 group interactive-hover ${isLoaded ? 'animate-fade-in-scale' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="flex items-start space-x-6">
                  <div className={`text-6xl p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-padding bg-neutral-50 dark:bg-neutral-950 mesh-bg relative">
        <div className="container-premium">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-black text-neutral-900 dark:text-neutral-100 mb-6">
              HOW IT
              <br />
              <span className="text-gradient-mocha">WORKS</span>
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Three simple steps to transform your freelancing experience forever
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'CONNECT',
                description: 'Link your wallet and create your professional profile on the blockchain',
                icon: '🔗'
              },
              {
                step: '02',
                title: 'DISCOVER',
                description: 'Browse thousands of projects or post your services to attract clients',
                icon: '🔍'
              },
              {
                step: '03',
                title: 'EARN',
                description: 'Complete work and receive instant payments with zero platform fees',
                icon: '💰'
              }
            ].map((step, index) => (
              <div
                key={index}
                className={`text-center group ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 300}ms` }}
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-300 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-sm font-black text-neutral-900">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-4">
                  {step.title}
                </h3>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10" />
        <div className="container-premium relative z-10">
          <div className="text-center">
            <h2 className="text-5xl lg:text-6xl font-black text-white mb-8">
              JOIN THE
              <br />
              <span className="text-gradient-gold animate-gradient-shift">REVOLUTION</span>
            </h2>
            <p className="text-2xl text-neutral-300 mb-12 max-w-3xl mx-auto">
              Be part of the future of work. Start earning more, paying less, and working smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  className="btn-premium btn-gold px-16 py-8 rounded-2xl text-2xl font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300"
                >
                  GET STARTED NOW
                </button>
              ) : (
                <Link
                  href="/browse"
                  className="btn-premium btn-gold px-16 py-8 rounded-2xl text-2xl font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300 inline-block"
                >
                  EXPLORE OPPORTUNITIES
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;