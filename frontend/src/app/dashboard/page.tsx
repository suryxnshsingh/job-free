'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { useTheme } from '@/contexts/ThemeContext';

interface Job {
  id: string;
  client: string;
  freelancer: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  paymentToken: string;
  deadline: number;
  status: number;
  metadataHash: string;
}

interface Bid {
  id: string;
  jobId: string;
  freelancer: string;
  amount: string;
  deliveryTime: number;
  proposalHash: string;
  stakedAmount: string;
  status: number;
  createdAt: number;
  portfolioHash: string;
}

interface JobWithBids extends Job {
  bids: Bid[];
}

export default function DashboardPage() {
  const { isConnected, account, connectWallet, getAllJobs, getJobBids } = useWeb3();
  const { isDark } = useTheme();
  const [myPostedJobs, setMyPostedJobs] = useState<JobWithBids[]>([]);
  const [myBids, setMyBids] = useState<(Bid & { jobTitle: string; jobBudget: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posted' | 'bids'>('posted');

  useEffect(() => {
    if (isConnected && account) {
      loadDashboardData();
    }
  }, [isConnected, account]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const allJobs = await getAllJobs();
      
      // Filter jobs posted by current user
      const postedJobs = allJobs.filter(job => 
        job.client.toLowerCase() === account?.toLowerCase()
      );

      // Get bids for each posted job
      const jobsWithBids: JobWithBids[] = [];
      for (const job of postedJobs) {
        try {
          const bids = await getJobBids(job.id);
          jobsWithBids.push({
            ...job,
            bids: bids.map((bid: any) => ({
              id: bid.id?.toString() || '0',
              jobId: job.id,
              freelancer: bid.freelancer,
              amount: bid.amount,
              deliveryTime: bid.deliveryTime,
              proposalHash: bid.proposalHash,
              stakedAmount: bid.stakeAmount || bid.stakedAmount,
              status: bid.status,
              createdAt: bid.submittedAt || bid.createdAt || Date.now(),
              portfolioHash: bid.portfolioHash || ''
            }))
          });
        } catch (error) {
          console.log(`Error loading bids for job ${job.id}:`, error);
          jobsWithBids.push({ ...job, bids: [] });
        }
      }
      setMyPostedJobs(jobsWithBids);

      // Find bids made by current user
      const userBids: (Bid & { jobTitle: string; jobBudget: string })[] = [];
      for (const job of allJobs) {
        try {
          const bids = await getJobBids(job.id);
          const userJobBids = bids.filter((bid: any) => 
            bid.freelancer.toLowerCase() === account?.toLowerCase()
          );
          
          userJobBids.forEach((bid: any) => {
            userBids.push({
              id: bid.id?.toString() || '0',
              jobId: job.id,
              freelancer: bid.freelancer,
              amount: bid.amount,
              deliveryTime: bid.deliveryTime,
              proposalHash: bid.proposalHash,
              stakedAmount: bid.stakeAmount || bid.stakedAmount,
              status: bid.status,
              createdAt: bid.submittedAt || bid.createdAt || Date.now(),
              portfolioHash: bid.portfolioHash || '',
              jobTitle: job.title,
              jobBudget: job.budget
            });
          });
        } catch (error) {
          console.log(`Error loading bids for job ${job.id}:`, error);
        }
      }
      setMyBids(userBids);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number) => {
    const statuses = ['Open', 'Assigned', 'In Progress', 'Submitted', 'Completed', 'Disputed', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };

  const getBidStatusText = (status: number) => {
    const statuses = ['Active', 'Accepted', 'Rejected', 'Withdrawn'];
    return statuses[status] || 'Unknown';
  };

  const getStatusColor = (status: number) => {
    const colors = [
      'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
      'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
      'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
      'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
      'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
      'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400'
    ];
    return colors[status] || colors[0];
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-20">
        <div className="container-premium py-16">
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-12 h-12 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-4xl font-black text-neutral-900 dark:text-neutral-100 mb-4">
              CONNECT YOUR WALLET
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
              Connect your wallet to view your dashboard
            </p>
            <button
              onClick={connectWallet}
              className="btn-premium btn-gold px-8 py-4 rounded-2xl font-bold transform hover:scale-105 transition-all duration-300"
            >
              CONNECT WALLET
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 mesh-bg">
        <div className="container-premium section-padding">
          <div className="text-center">
            <h1 className="text-6xl lg:text-7xl font-black text-white mb-8">
              YOUR
              <br />
              <span className="text-gradient-gold animate-gradient-shift">DASHBOARD</span>
            </h1>
            <p className="text-2xl text-neutral-300 max-w-3xl mx-auto mb-12">
              Manage your posted jobs and track your bids across the platform
            </p>
          </div>
        </div>
      </section>

      <div className="container-premium py-16">
        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 p-2 glass-strong rounded-2xl max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('posted')}
            className={`
              relative px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 flex-1
              ${activeTab === 'posted'
                ? 'text-neutral-900 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-lg transform scale-105'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }
            `}
          >
            📋 POSTED ({myPostedJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={`
              relative px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 flex-1
              ${activeTab === 'bids'
                ? 'text-neutral-900 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-lg transform scale-105'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }
            `}
          >
            🎯 MY BIDS ({myBids.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
              LOADING DASHBOARD...
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Fetching your jobs and bids from the blockchain
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'posted' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-6">
                  YOUR POSTED JOBS
                </h2>
                
                {myPostedJobs.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-4xl">📝</span>
                    </div>
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
                      NO JOBS POSTED YET
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Create your first job to start working with freelancers
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myPostedJobs.map((job) => (
                      <div key={job.id} className="card-luxury p-8 group interactive-hover animate-fade-in-scale">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 group-hover:text-gradient-gold transition-all duration-300">
                                {job.title}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                                {getStatusText(job.status)}
                              </span>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-2">
                              {job.description}
                            </p>
                            <div className="flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
                              <span>💰 {job.budget} ETH</span>
                              <span>📅 {new Date(job.deadline * 1000).toLocaleDateString()}</span>
                              <span>🎯 {job.bids.length} Bids</span>
                            </div>
                          </div>
                        </div>

                        {job.bids.length > 0 && (
                          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                            <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                              Received Bids ({job.bids.length})
                            </h4>
                            <div className="space-y-4">
                              {job.bids.slice(0, 3).map((bid) => (
                                <div key={bid.id} className="bg-neutral-50/80 dark:bg-neutral-900/80 rounded-2xl p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                          {bid.freelancer.slice(0, 6)}...{bid.freelancer.slice(-4)}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(bid.status)}`}>
                                          {getBidStatusText(bid.status)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                        <span>💵 {bid.amount} ETH</span>
                                        <span>⏱️ {bid.deliveryTime} days</span>
                                        <span>🔒 {bid.stakedAmount} FDAO staked</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {job.bids.length > 3 && (
                                <div className="text-center">
                                  <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                                    + {job.bids.length - 3} more bids
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bids' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-6">
                  YOUR BID HISTORY
                </h2>
                
                {myBids.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-4xl">🎯</span>
                    </div>
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
                      NO BIDS SUBMITTED YET
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Browse available jobs and submit your first bid
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myBids.map((bid) => (
                      <div key={`${bid.jobId}-${bid.id}`} className="card-luxury p-8 group interactive-hover animate-fade-in-scale">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 group-hover:text-gradient-gold transition-all duration-300">
                                {bid.jobTitle}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bid.status)}`}>
                                {getBidStatusText(bid.status)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-neutral-500 dark:text-neutral-400">Your Bid</span>
                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                  💵 {bid.amount} ETH
                                </div>
                              </div>
                              <div>
                                <span className="text-neutral-500 dark:text-neutral-400">Job Budget</span>
                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                  💰 {bid.jobBudget} ETH
                                </div>
                              </div>
                              <div>
                                <span className="text-neutral-500 dark:text-neutral-400">Delivery</span>
                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                  ⏱️ {bid.deliveryTime} days
                                </div>
                              </div>
                              <div>
                                <span className="text-neutral-500 dark:text-neutral-400">Staked</span>
                                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                  🔒 {bid.stakedAmount} FDAO
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}