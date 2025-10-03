'use client'

import React, { useState, useEffect } from 'react'
import CreateJobForm from '@/components/features/CreateJobForm'
import { JobCard } from '@/components/ui/JobCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useWeb3 } from '@/contexts/Web3Context'
import { useTheme } from '@/contexts/ThemeContext'

interface JobListing {
  id: string
  title: string
  description: string
  budget: string
  client: string
  status: number
  paymentToken: string
}

export default function JobsPage() {
  const { isConnected, account, getAllJobs, getJobDetails } = useWeb3()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-jobs'>('browse')
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(false)
  const [createdJobIds, setCreatedJobIds] = useState<string[]>([])

  // Load all jobs
  useEffect(() => {
    loadAllJobs()
  }, [])

  const loadAllJobs = async () => {
    try {
      setLoading(true)
      const allJobs = await getAllJobs()
      const formattedJobs = allJobs.map((job, index) => ({
        id: (index + 1).toString(),
        title: job.title,
        description: job.description,
        budget: job.budget,
        client: job.client,
        status: job.status,
        paymentToken: job.paymentToken || '0x0000000000000000000000000000000000000000'
      }))
      setJobs(formattedJobs)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJobCreated = (jobId: string) => {
    setCreatedJobIds(prev => [...prev, jobId])
    setActiveTab('my-jobs')
    loadAllJobs() // Refresh all jobs
  }

  const myJobs = jobs.filter(job => job.client.toLowerCase() === account?.toLowerCase())

  const TabButton = ({ id, label, icon, isActive, onClick }: {
    id: string
    label: string
    icon: string
    isActive: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={`
        relative px-6 py-3 rounded-xl font-black text-sm transition-all duration-300
        ${isActive
          ? 'text-neutral-900 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-lg transform scale-105'
          : 'text-neutral-600 dark:text-neutral-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }
      `}
    >
      <span className="mr-2">{icon}</span>
      {label}
      {id === 'my-jobs' && myJobs.length > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs bg-black/20 rounded-full">
          {myJobs.length}
        </span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 mesh-bg">
        <div className="container-premium section-padding">
          <div className="text-center">
            <h1 className="text-6xl lg:text-7xl font-black text-white mb-8">
              MANAGE
              <br />
              <span className="text-gradient-gold animate-gradient-shift">YOUR WORK</span>
            </h1>
            <p className="text-2xl text-neutral-300 max-w-3xl mx-auto mb-12">
              Create projects, browse opportunities, and track your blockchain-powered freelance journey
            </p>
          </div>
        </div>
      </section>

      <div className="container-premium py-16">
        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 p-2 glass-strong rounded-2xl">
          <TabButton
            id="browse"
            label="Browse Jobs"
            icon="🔍"
            isActive={activeTab === 'browse'}
            onClick={() => setActiveTab('browse')}
          />
          <TabButton
            id="create"
            label="Create Job"
            icon="✨"
            isActive={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
          />
          <TabButton
            id="my-jobs"
            label="My Jobs"
            icon="💼"
            isActive={activeTab === 'my-jobs'}
            onClick={() => setActiveTab('my-jobs')}
          />
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'browse' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Available Opportunities
                </h2>
                <AnimatedButton
                  variant="ghost"
                  size="md"
                  onClick={loadAllJobs}
                  loading={loading}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  Refresh
                </AnimatedButton>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-3/4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-bounce">
                    <span className="text-4xl">📝</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Jobs Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Be the first to create a job on the platform
                  </p>
                  <AnimatedButton
                    variant="primary"
                    size="lg"
                    onClick={() => setActiveTab('create')}
                    icon={<span>✨</span>}
                  >
                    Create First Job
                  </AnimatedButton>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onViewDetails={(jobId) => console.log('View details:', jobId)}
                      className="animate-slide-in"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-4xl mx-auto">
              <CreateJobForm onJobCreated={handleJobCreated} />
            </div>
          )}

          {activeTab === 'my-jobs' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                My Projects
              </h2>
              
              {!isConnected ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Connect Your Wallet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Connect your wallet to view your jobs
                  </p>
                </div>
              ) : myJobs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-float">
                    <span className="text-4xl">💼</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Jobs Created Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Start your journey by creating your first job
                  </p>
                  <AnimatedButton
                    variant="primary"
                    size="lg"
                    onClick={() => setActiveTab('create')}
                    icon={<span>✨</span>}
                  >
                    Create Your First Job
                  </AnimatedButton>
                </div>
              ) : (
                <div className="space-y-6">
                  {myJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {job.title}
                            </h3>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                              Job #{job.id}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                            {job.description}
                          </p>
                          <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {job.budget} ETH
                          </div>
                        </div>
                        
                        <div className="mt-4 md:mt-0 md:ml-6 flex space-x-3">
                          <AnimatedButton
                            variant="ghost"
                            size="md"
                            onClick={() => console.log('View proposals for job:', job.id)}
                            icon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            }
                          >
                            View Bids
                          </AnimatedButton>
                          <AnimatedButton
                            variant="primary"
                            size="md"
                            onClick={() => console.log('Manage job:', job.id)}
                            icon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            }
                          >
                            Manage
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}