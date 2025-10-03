'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="relative w-full h-full">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"></div>
        {/* Inner pulsing circle */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-75 animate-pulse"></div>
        {/* Core dot */}
        <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-900 animate-ping"></div>
      </div>
    </div>
  );
};

export const TransactionLoader: React.FC<{ message?: string }> = ({ 
  message = "Processing transaction..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        <LoadingSpinner size="xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-white animate-pulse">
          {message}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Confirm transaction in MetaMask
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;