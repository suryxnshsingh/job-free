'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'

interface CreateJobFormData {
  title: string
  description: string
  category: string
  budget: string
  deadline: string
}

interface CreateJobFormProps {
  onJobCreated?: (jobId: string) => void
}

export default function CreateJobForm({ onJobCreated }: CreateJobFormProps = {}) {
  const { account, createJob, isConnected, isUserRegistered, registerUser } = useWeb3()
  const [formData, setFormData] = useState<CreateJobFormData>({
    title: '',
    description: '',
    category: 'development',
    budget: '',
    deadline: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [userRegistered, setUserRegistered] = useState(false)

  // Check user registration when account changes
  useEffect(() => {
    const checkRegistration = async () => {
      if (account && isConnected) {
        const registered = await isUserRegistered(account)
        setUserRegistered(registered)
        if (!registered) {
          console.log('User not registered, will auto-register on job creation')
        }
      }
    }
    checkRegistration()
  }, [account, isConnected, isUserRegistered])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !account) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' })
      return
    }

    if (!formData.title || !formData.description || !formData.budget) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    // Validate minimum budget
    const budgetValue = parseFloat(formData.budget)
    if (budgetValue < 0.01) {
      setMessage({ type: 'error', text: 'Budget must be at least 0.01 ETH (smart contract requirement)' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Auto-register user if not registered (remove signin requirement)
      if (!userRegistered) {
        setMessage({ type: 'success', text: 'Registering user automatically...' })
        const registered = await registerUser('QmAutoRegisteredProfile', 2) // UserType.Both = 2
        if (!registered) {
          throw new Error('Failed to auto-register user')
        }
        setUserRegistered(true)
        setMessage({ type: 'success', text: 'User registered successfully! Creating job...' })
      }

      // Get current blockchain time and add 7 days for deadline
      const currentTime = Math.floor(Date.now() / 1000)
      const deadline = currentTime + (7 * 24 * 60 * 60) // 7 days from now
      
      console.log('Creating job with:')
      console.log('- Title:', formData.title)
      console.log('- Budget:', formData.budget, 'ETH')
      console.log('- Deadline:', new Date(deadline * 1000))
      console.log('- Account:', account)
      console.log('- User registered:', userRegistered)
      
      const jobId = await createJob(
        formData.title,
        formData.description,
        formData.category,
        formData.budget,
        '0x0000000000000000000000000000000000000000', // ETH address
        deadline,
        'QmJobMetadata123', // IPFS hash placeholder
        [1, 2], // skill IDs placeholder
        [3, 4]  // skill levels placeholder
      )

      if (jobId) {
        setMessage({ 
          type: 'success', 
          text: `Job created successfully! Job ID: ${jobId}` 
        })
        
        // Call the onJobCreated callback if provided
        if (onJobCreated) {
          onJobCreated(jobId)
        }
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'development',
          budget: '',
          deadline: ''
        })
      } else {
        throw new Error('Job creation returned null')
      }

    } catch (error: any) {
      console.error('Error creating job:', error)
      setMessage({ 
        type: 'error', 
        text: `Failed to create job: ${error.message || 'Unknown error'}` 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to create a job on the platform
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Create Your Project
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Post your project and connect with talented freelancers worldwide using blockchain technology
        </p>
      </div>
      
      {/* Status Messages */}
      {message && (
        <div className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
          message.type === 'success' 
            ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
            : 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
        }`}>
          <div className="flex items-center space-x-3">
            {message.type === 'success' ? (
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Job Title */}
            <div className="space-y-3">
              <label htmlFor="title" className="block text-lg font-semibold text-gray-900 dark:text-white">
                Job Title *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg transition-all duration-300"
                  placeholder="e.g., Build a Modern E-commerce Website"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-3">
              <label htmlFor="description" className="block text-lg font-semibold text-gray-900 dark:text-white">
                Project Description *
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg transition-all duration-300 resize-none"
                  placeholder="Describe your project requirements, skills needed, deliverables, and any specific preferences..."
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Category */}
              <div className="space-y-3">
                <label htmlFor="category" className="block text-lg font-semibold text-gray-900 dark:text-white">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-900 dark:text-white text-lg transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="development">🚀 Development</option>
                    <option value="design">🎨 Design</option>
                    <option value="marketing">📢 Marketing</option>
                    <option value="writing">✍️ Writing</option>
                    <option value="other">🔧 Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-3">
                <label htmlFor="budget" className="block text-lg font-semibold text-gray-900 dark:text-white">
                  Budget (ETH) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <input
                    type="number"
                    id="budget"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full pl-16 pr-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg transition-all duration-300"
                    placeholder="0.1"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-2">Minimum 0.01 ETH required by smart contract</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-pink-50/80 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Contract Details</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Your job will be automatically set with a 7-day deadline. The smart contract will handle escrow management, 
                    ensuring secure payments for both you and the freelancer.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !isConnected}
                className={`w-full py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
                  isSubmitting || !isConnected
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:shadow-2xl hover:scale-105 active:scale-95'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating Your Project...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Create Project</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Wallet Connected</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">{account}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${userRegistered ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {userRegistered ? 'Registered ✅' : 'Auto-register on creation ⚡'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}