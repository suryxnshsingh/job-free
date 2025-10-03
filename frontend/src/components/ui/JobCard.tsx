'use client';

import React, { useState } from 'react';
import { AnimatedButton } from './AnimatedButton';
import { useTheme } from '@/contexts/ThemeContext';

interface JobCardProps {
  job: {
    id?: string;
    title: string;
    description: string;
    budget: string;
    client: string;
    status: number;
    paymentToken?: string;
  };
  onBid?: (jobId: string) => void;
  onViewDetails?: (jobId: string) => void;
  showBidButton?: boolean;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onBid,
  onViewDetails,
  showBidButton = false,
  className = ''
}) => {
  const { isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusInfo = (status: number) => {
    const statusMap = {
      0: { text: 'Open', color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
      1: { text: 'Assigned', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
      2: { text: 'In Progress', color: 'from-yellow-500 to-orange-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
      3: { text: 'Submitted', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
      4: { text: 'Completed', color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
      5: { text: 'Disputed', color: 'from-red-500 to-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
      6: { text: 'Cancelled', color: 'from-gray-400 to-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900/30' }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap[0];
  };

  const statusInfo = getStatusInfo(job.status);

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl
        transition-all duration-500 transform hover:scale-105
        ${isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-900/20 dark:via-purple-900/10 dark:to-pink-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-0 group-hover:opacity-75"></div>
        <div className="absolute top-1/4 -left-1 w-1 h-1 bg-purple-400 rounded-full animate-bounce opacity-0 group-hover:opacity-75 delay-100"></div>
        <div className="absolute bottom-1/4 -right-1 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse opacity-0 group-hover:opacity-75 delay-200"></div>
      </div>

      {/* Content */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
              {job.title}
            </h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bgColor}`}>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${statusInfo.color} mr-2 animate-pulse`}></div>
              <span className="text-gray-700 dark:text-gray-300">{statusInfo.text}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {job.budget} ETH
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Budget</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
          {job.description}
        </p>

        {/* Client Info */}
        <div className="flex items-center space-x-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {job.client.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Client</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {job.client.slice(0, 6)}...{job.client.slice(-4)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          {showBidButton && job.status === 0 && (
            <AnimatedButton
              variant="primary"
              size="md"
              onClick={() => onBid?.(job.id || '')}
              className="flex-1"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              }
            >
              Place Bid
            </AnimatedButton>
          )}
          
          <AnimatedButton
            variant="ghost"
            size="md"
            onClick={() => onViewDetails?.(job.id || '')}
            className={showBidButton ? 'flex-1' : 'w-full'}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          >
            View Details
          </AnimatedButton>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
};

export default JobCard;