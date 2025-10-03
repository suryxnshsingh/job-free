'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { useTheme } from '@/contexts/ThemeContext';

interface Job {
  id: string;
  client: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  paymentToken: string;
  deadline: number;
  status: number;
  metadataHash: string;
}

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmitBid: (bidData: {
    jobId: string;
    bidAmount: string;
    deliveryDays: number;
    proposal: string;
    portfolio: string;
    stakeAmount: string;
  }) => void;
  isSubmitting: boolean;
}

const BidModal: React.FC<BidModalProps> = ({ isOpen, onClose, job, onSubmitBid, isSubmitting }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [proposal, setProposal] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const { isDark } = useTheme();

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitBid({
      jobId: job.id,
      bidAmount,
      deliveryDays,
      proposal,
      portfolio,
      stakeAmount
    });
  };

  // Initialize stake amount to minimum if empty
  if (!stakeAmount) {
    setStakeAmount('50');
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-scale">
      <div className="glass-strong rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {isSubmitting ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
              SUBMITTING BID
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Processing your blockchain transaction...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-8 border-b border-neutral-200/20 dark:border-neutral-700/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
                    PLACE YOUR BID
                  </h2>
                  <p className="text-lg text-gradient-gold font-semibold">{job.title}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Bid Amount */}
              <div className="space-y-3">
                <label className="block text-lg font-black text-neutral-900 dark:text-neutral-100">
                  YOUR BID AMOUNT
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    required
                    className="input-premium text-2xl font-bold"
                    placeholder="0.050"
                  />
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-lg font-bold text-gradient-gold">
                    ETH
                  </div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Client budget: <span className="font-semibold text-gradient-mocha">{job.budget} ETH</span>
                </p>
              </div>

              {/* Stake Amount */}
              <div className="space-y-3">
                <label className="block text-lg font-black text-neutral-900 dark:text-neutral-100">
                  STAKE AMOUNT (SECURITY DEPOSIT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="50"
                    max="5000"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    required
                    className="input-premium text-2xl font-bold"
                    placeholder="50"
                  />
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-lg font-bold text-gradient-gold">
                    FDAO
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Range: <span className="font-semibold text-gradient-mocha">50 - 5000 FDAO</span> tokens
                  </p>
                  <button
                    type="button"
                    onClick={() => setStakeAmount('50')}
                    className="text-sm font-semibold text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    Use Minimum
                  </button>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Note:</strong> You need at least 100 FDAO tokens staked in your profile to place bids. 
                    This stake amount is separate and secures your specific bid.
                  </p>
                </div>
              </div>

              {/* Delivery Time */}
              <div className="space-y-3">
                <label className="block text-lg font-black text-neutral-900 dark:text-neutral-100">
                  DELIVERY TIME (DAYS)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(parseInt(e.target.value))}
                  required
                  className="input-premium text-2xl font-bold"
                />
              </div>

              {/* Proposal */}
              <div className="space-y-3">
                <label className="block text-lg font-black text-neutral-900 dark:text-neutral-100">
                  YOUR PROPOSAL
                </label>
                <textarea
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  required
                  rows={4}
                  className="input-premium text-lg resize-none"
                  placeholder="Describe your approach, experience, and why you're the perfect fit for this project..."
                />
              </div>

              {/* Portfolio */}
              <div className="space-y-3">
                <label className="block text-lg font-black text-neutral-900 dark:text-neutral-100">
                  PORTFOLIO LINKS (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="input-premium text-lg"
                  placeholder="https://github.com/yourprofile, https://portfolio.com..."
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Showcase your best work with links to GitHub, portfolio, or previous projects
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-8 py-4 rounded-2xl border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-bold text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!bidAmount || !stakeAmount || !proposal}
                  className="flex-1 btn-premium btn-gold px-8 py-4 rounded-2xl text-lg font-bold text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>SUBMIT BID</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const JobCard: React.FC<{ job: Job; onBid: (jobId: string) => void }> = ({ job, onBid }) => {
  return (
    <div className="card-luxury p-8 group interactive-hover animate-fade-in-scale">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-gradient-gold transition-all duration-300">
              {job.title}
            </h3>
            <div className="flex items-center space-x-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{job.client.slice(0, 6)}...{job.client.slice(-4)}</span>
              </span>
              <span className="w-1 h-1 bg-neutral-400 rounded-full"></span>
              <span className="status-success text-xs">
                Active
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-gradient-gold mb-1">
              {job.budget} ETH
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Budget
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed line-clamp-3">
          {job.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {['Blockchain', 'Smart Contracts', 'Web3'].map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {tag}
            </span>
          ))}
        </div>

        {/* Action */}
        <button
          onClick={() => onBid(job.id)}
          className="w-full btn-premium btn-gold py-4 rounded-2xl text-lg font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>PLACE BID</span>
        </button>
      </div>
    </div>
  );
};

export default function BrowsePage() {
  const { isConnected, account, connectWallet, getAllJobs, submitBid, getTokenBalance, isUserRegistered, registerUser } = useWeb3();
  const { isDark } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (account && isConnected) {
      checkUserRegistration();
      loadTokenBalance();
    }
  }, [account, isConnected]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const allJobs = await getAllJobs();
      setJobs(allJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRegistration = async () => {
    if (account) {
      const registered = await isUserRegistered(account);
      setUserRegistered(registered);
    }
  };

  const loadTokenBalance = async () => {
    if (account) {
      const balance = await getTokenBalance(account);
      setTokenBalance(balance);
    }
  };

  const handleBid = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setShowBidModal(true);
    }
  };

  const handleSubmitBid = async (bidData: {
    jobId: string;
    bidAmount: string;
    deliveryDays: number;
    proposal: string;
    portfolio: string;
    stakeAmount: string;
  }) => {
    try {
      setSubmittingBid(true);
      
      // Auto-register if needed
      if (!userRegistered) {
        await registerUser('QmFreelancerProfile', 1); // UserType.Freelancer = 1
        setUserRegistered(true);
      }

      await submitBid(
        bidData.jobId,
        bidData.bidAmount,
        bidData.deliveryDays,
        bidData.proposal,
        bidData.portfolio || 'QmDefaultPortfolio',
        bidData.stakeAmount
      );

      setMessage({ type: 'success', text: 'Bid submitted successfully!' });
      setShowBidModal(false);
      await loadJobs(); // Refresh jobs
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      setMessage({ type: 'error', text: `Failed to submit bid: ${error.message}` });
    } finally {
      setSubmittingBid(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 mesh-bg">
        <div className="container-premium section-padding">
          <div className="text-center">
            <h1 className="text-6xl lg:text-7xl font-black text-white mb-8">
              DISCOVER
              <br />
              <span className="text-gradient-gold animate-gradient-shift">OPPORTUNITIES</span>
            </h1>
            <p className="text-2xl text-neutral-300 max-w-3xl mx-auto mb-12">
              Browse world-class projects, stake your expertise, and bid with blockchain-powered security
            </p>
            
            {!isConnected && (
              <button
                onClick={connectWallet}
                className="btn-premium btn-gold px-12 py-6 rounded-2xl text-xl font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 mx-auto"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>CONNECT WALLET TO START</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="container-premium py-16">
        {/* Connection Status */}
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto glass-strong rounded-3xl p-12">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse-glow">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-4">
                CONNECT YOUR WALLET
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                Connect your wallet to browse jobs and start earning
              </p>
              <button
                onClick={connectWallet}
                className="btn-premium btn-gold px-8 py-4 rounded-2xl text-lg font-bold text-neutral-900 transform hover:scale-105 transition-all duration-300"
              >
                CONNECT WALLET
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* User Dashboard */}
            <div className="glass-strong rounded-3xl p-8 mb-12">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Connected Account
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-gradient-gold mb-2">
                    {tokenBalance} FDAO
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Token Balance
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-black mb-2 ${userRegistered ? 'text-green-500' : 'text-yellow-500'}`}>
                    {userRegistered ? '✅ VERIFIED' : '⚡ AUTO-REGISTER'}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Status
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-8 p-6 rounded-2xl ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {message.type === 'success' ? '✅' : '❌'}
                  </div>
                  <div className="font-semibold">{message.text}</div>
                </div>
              </div>
            )}

            {/* Jobs Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-neutral-900 dark:text-neutral-100">
                  AVAILABLE PROJECTS
                </h2>
                <button
                  onClick={loadJobs}
                  className="px-6 py-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>REFRESH</span>
                </button>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass rounded-3xl p-8 animate-pulse">
                      <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded mb-4"></div>
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-6 w-3/4"></div>
                      <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-8xl mb-8">📝</div>
                  <h3 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-4">
                    NO PROJECTS AVAILABLE
                  </h3>
                  <p className="text-xl text-neutral-600 dark:text-neutral-400">
                    Check back later for new opportunities
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onBid={handleBid}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bid Modal */}
      <BidModal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        job={selectedJob}
        onSubmitBid={handleSubmitBid}
        isSubmitting={submittingBid}
      />
    </div>
  );
}