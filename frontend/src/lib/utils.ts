import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(
  price: number | string,
  options: {
    currency?: 'USD' | 'ETH' | 'MATIC' | 'BTC'
    notation?: Intl.NumberFormatOptions['notation']
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
) {
  const {
    currency = 'USD',
    notation = 'standard',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numericPrice)
  }

  // For crypto currencies, just add the symbol
  return `${numericPrice.toFixed(maximumFractionDigits)} ${currency}`
}

export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
) {
  const {
    dateStyle = 'medium',
    timeStyle,
    ...rest
  } = options

  const dateObj = new Date(date)
  
  return new Intl.DateTimeFormat('en-US', {
    dateStyle,
    timeStyle,
    ...rest,
  }).format(dateObj)
}

export function formatRelativeTime(date: Date | string | number) {
  const dateObj = new Date(date)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y ago`
}

export function truncateAddress(address: string, length = 4) {
  if (!address) return ''
  return `${address.slice(0, 2 + length)}...${address.slice(-length)}`
}

export function formatTokenAmount(
  amount: string | number,
  decimals = 18,
  displayDecimals = 4
) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const factor = Math.pow(10, decimals)
  const formattedAmount = numericAmount / factor
  
  return formattedAmount.toFixed(displayDecimals)
}

export function generateAvatar(seed: string) {
  // Simple deterministic avatar generation based on seed
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
  ]
  
  const colorIndex = seed.charCodeAt(0) % colors.length
  const initials = seed.slice(0, 2).toUpperCase()
  
  return {
    color: colors[colorIndex],
    initials,
  }
}

export function calculateReputationLevel(reputation: number) {
  if (reputation < 100) return { level: 'Newcomer', color: 'text-gray-600' }
  if (reputation < 250) return { level: 'Rising Star', color: 'text-blue-600' }
  if (reputation < 500) return { level: 'Skilled', color: 'text-green-600' }
  if (reputation < 750) return { level: 'Expert', color: 'text-purple-600' }
  if (reputation < 900) return { level: 'Master', color: 'text-orange-600' }
  return { level: 'Legend', color: 'text-red-600' }
}

export function getJobStatusColor(status: string) {
  const statusColors = {
    OPEN: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    DISPUTED: 'bg-yellow-100 text-yellow-800',
  }
  
  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
}

export function getContractStatusColor(status: string) {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    DISPUTED: 'bg-orange-100 text-orange-800',
  }
  
  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
}

export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateWalletAddress(address: string) {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  return ethAddressRegex.test(address)
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func.apply(null, args)
    }
  }
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return Promise.resolve()
  }
}

export function generateSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function pluralize(count: number, singular: string, plural?: string) {
  if (count === 1) return singular
  return plural || `${singular}s`
}

export function formatFileSize(bytes: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  
  return `${Math.round(size * 100) / 100} ${sizes[i]}`
}

export function isValidUrl(string: string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}