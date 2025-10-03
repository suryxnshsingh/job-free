'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ToastProps {
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  className?: string
}

export const Toast: React.FC<ToastProps> = ({ 
  title, 
  description, 
  type = 'info', 
  className 
}) => {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className={cn(
      'p-4 border rounded-lg',
      typeClasses[type],
      className
    )}>
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm">{description}</div>}
    </div>
  )
}

export default Toast