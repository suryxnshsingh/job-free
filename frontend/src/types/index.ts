// Base types
export interface User {
  id: string
  walletAddress: string
  email?: string
  firstName?: string
  lastName?: string
  avatar?: string
  bio?: string
  location?: string
  userType: 'CLIENT' | 'FREELANCER' | 'BOTH' | 'ADMIN'
  reputation: number
  isEmailVerified: boolean
  isActive: boolean
  isBlocked: boolean
  createdAt: string
  lastActiveAt: string
  presenceStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY'
  stakingRewards?: number
  profileData?: any
}

export interface Job {
  id: string
  title: string
  description: string
  category: string
  budget: number
  paymentToken: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'ARCHIVED'
  deadline: string
  clientId: string
  client: User
  skills: JobSkill[]
  proposals: Proposal[]
  selectedFreelancerId?: string
  selectedFreelancer?: User
  metadataHash?: string
  isUrgent: boolean
  isFeatured: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface JobSkill {
  id: string
  jobId: string
  skillId: string
  skill: Skill
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
}

export interface Skill {
  id: string
  name: string
  category: string
  description?: string
  isActive: boolean
}

export interface Proposal {
  id: string
  jobId: string
  job: Job
  freelancerId: string
  freelancer: User
  coverLetter: string
  bidAmount: number
  deliveryTime: number
  isAccepted: boolean
  proposalData?: any
  attachments: ProposalAttachment[]
  createdAt: string
  updatedAt: string
}

export interface ProposalAttachment {
  id: string
  proposalId: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
}

export interface Contract {
  id: string
  jobId: string
  job: Job
  clientId: string
  client: User
  freelancerId: string
  freelancer: User
  agreedAmount: number
  paymentToken: string
  deadline: string
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
  startedAt?: string
  completedAt?: string
  cancelledAt?: string
  milestones: Milestone[]
  escrows: Escrow[]
  workSubmissions: WorkSubmission[]
  reviews: Review[]
  contractData?: any
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  contractId: string
  title: string
  description: string
  amount: number
  deadline: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  completedAt?: string
  order: number
  createdAt: string
}

export interface Escrow {
  id: string
  contractId: string
  contract: Contract
  amount: number
  paymentToken: string
  status: 'PENDING' | 'FUNDED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED'
  blockchainTxHash?: string
  autoReleaseAt?: string
  autoReleaseEnabled: boolean
  releasedAt?: string
  refundedAt?: string
  releaseMethod?: 'MANUAL' | 'AUTO_RELEASE' | 'DISPUTE_RESOLUTION'
  createdAt: string
  updatedAt: string
}

export interface WorkSubmission {
  id: string
  contractId: string
  contract: Contract
  freelancerId: string
  freelancer: User
  title: string
  description: string
  deliverables: WorkDeliverable[]
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'
  feedback?: string
  submittedAt: string
  reviewedAt?: string
}

export interface WorkDeliverable {
  id: string
  workSubmissionId: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  description?: string
}

export interface Review {
  id: string
  contractId: string
  contract: Contract
  reviewerId: string
  reviewer: User
  revieweeId: string
  reviewee: User
  rating: number
  comment?: string
  reviewType: 'CLIENT_REVIEW' | 'FREELANCER_REVIEW'
  isPublic: boolean
  createdAt: string
}

export interface Message {
  id: string
  senderId: string
  sender: User
  recipientId: string
  recipient: User
  contractId?: string
  content: string
  isRead: boolean
  readAt?: string
  messageType: 'TEXT' | 'FILE' | 'SYSTEM'
  attachments: MessageAttachment[]
  createdAt: string
}

export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: any
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface Dispute {
  id: string
  contractId: string
  contract: Contract
  raisedBy: 'CLIENT' | 'FREELANCER'
  raisedById: string
  raisedByUser: User
  reason: string
  description: string
  evidence: DisputeEvidence[]
  status: 'PENDING' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED'
  resolution?: string
  resolvedAt?: string
  arbitrators: DisputeArbitrator[]
  votes: DisputeVote[]
  createdAt: string
  updatedAt: string
}

export interface DisputeEvidence {
  id: string
  disputeId: string
  submittedBy: 'CLIENT' | 'FREELANCER' | 'ARBITRATOR'
  submittedById: string
  description: string
  attachments: DisputeAttachment[]
  submittedAt: string
}

export interface DisputeAttachment {
  id: string
  evidenceId: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
}

export interface DisputeArbitrator {
  id: string
  disputeId: string
  arbitratorId: string
  arbitrator: User
  assignedAt: string
  isActive: boolean
}

export interface DisputeVote {
  id: string
  disputeId: string
  arbitratorId: string
  arbitrator: User
  vote: 'CLIENT_FAVOR' | 'FREELANCER_FAVOR' | 'PARTIAL_CLIENT' | 'PARTIAL_FREELANCER'
  reasoning?: string
  votedAt: string
}

export interface Payment {
  id: string
  escrowId: string
  escrow: Escrow
  fromUserId: string
  fromUser: User
  toUserId: string
  toUser: User
  amount: number
  paymentToken: string
  transactionHash?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  networkFee?: number
  platformFee?: number
  processedAt?: string
  failureReason?: string
  createdAt: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: {
    message: string
    code: string
    details?: any
  }
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface WalletConnectionState {
  isConnected: boolean
  address?: string
  chainId?: number
  isConnecting: boolean
  error?: string
}

// Form types
export interface JobFormData {
  title: string
  description: string
  category: string
  budget: number
  paymentToken: string
  deadline: string
  skills: Array<{
    skillId: string
    level: string
  }>
  isUrgent: boolean
  attachments?: File[]
}

export interface ProposalFormData {
  coverLetter: string
  bidAmount: number
  deliveryTime: number
  attachments?: File[]
}

export interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  bio: string
  location: string
  hourlyRate?: number
  skills: string[]
  portfolio: PortfolioItem[]
}

export interface PortfolioItem {
  id?: string
  title: string
  description: string
  imageUrl?: string
  projectUrl?: string
  technologies: string[]
}

// Search and filter types
export interface JobFilters {
  category?: string
  minBudget?: number
  maxBudget?: number
  paymentToken?: string
  skills?: string[]
  isUrgent?: boolean
  sortBy?: 'newest' | 'budget_asc' | 'budget_desc' | 'deadline'
  search?: string
}

export interface FreelancerFilters {
  skills?: string[]
  minReputation?: number
  maxHourlyRate?: number
  location?: string
  availability?: boolean
  sortBy?: 'reputation' | 'hourly_rate' | 'newest'
  search?: string
}

// WebSocket event types
export interface SocketEvents {
  'message:received': (data: { message: Message }) => void
  'message:typing': (data: { senderId: string; isTyping: boolean }) => void
  'notification:new': (data: { notification: Notification }) => void
  'job:updated': (data: { jobId: string; status: string }) => void
  'contract:updated': (data: { contractId: string; status: string }) => void
  'presence:updated': (data: { userId: string; status: string }) => void
}

// Store types
export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  error: string | null
}

export interface WalletState {
  isConnected: boolean
  address?: string
  chainId?: number
  balance?: string
  isConnecting: boolean
  error?: string
}

export interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface TableColumn<T = any> {
  key: string
  title: string
  dataIndex?: string
  render?: (value: any, record: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string | number
}

export interface FilterOption {
  label: string
  value: string | number
  count?: number
}

// Chart and analytics types
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface AnalyticsData {
  totalJobs: number
  totalFreelancers: number
  totalContracts: number
  totalPayments: number
  recentActivity: ChartDataPoint[]
  topSkills: ChartDataPoint[]
  monthlyRevenue: ChartDataPoint[]
}

// Error types
export interface FormError {
  field: string
  message: string
}

export interface ValidationErrors {
  [key: string]: string[]
}