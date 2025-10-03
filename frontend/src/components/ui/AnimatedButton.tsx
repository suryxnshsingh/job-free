'use client';

import React, { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  icon,
  iconPosition = 'left'
}) => {
  const baseClasses = `
    relative overflow-hidden font-semibold rounded-lg transition-all duration-300 
    transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    before:absolute before:inset-0 before:bg-gradient-to-r before:opacity-0 
    before:transition-opacity before:duration-300 hover:before:opacity-10
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white
      hover:from-blue-700 hover:via-purple-700 hover:to-blue-900
      focus:ring-blue-500 shadow-lg hover:shadow-xl
      before:from-white before:to-white
    `,
    secondary: `
      bg-gradient-to-r from-gray-600 to-gray-800 text-white
      hover:from-gray-700 hover:to-gray-900
      focus:ring-gray-500 shadow-lg hover:shadow-xl
      before:from-white before:to-white
    `,
    success: `
      bg-gradient-to-r from-green-600 to-emerald-700 text-white
      hover:from-green-700 hover:to-emerald-800
      focus:ring-green-500 shadow-lg hover:shadow-xl
      before:from-white before:to-white
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-rose-700 text-white
      hover:from-red-700 hover:to-rose-800
      focus:ring-red-500 shadow-lg hover:shadow-xl
      before:from-white before:to-white
    `,
    ghost: `
      bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
      hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400
      focus:ring-blue-500
      before:from-blue-500 before:to-purple-500
    `
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
        ${isDisabled ? 'transform-none' : 'hover:scale-105'}
      `}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer group-hover:translate-x-full transition-transform duration-1000"></div>
      
      {/* Content */}
      <div className="relative flex items-center justify-center space-x-2">
        {loading ? (
          <LoadingSpinner size={size === 'sm' ? 'sm' : 'md'} />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="animate-pulse">{icon}</span>
            )}
            <span>{children}</span>
            {icon && iconPosition === 'right' && (
              <span className="animate-pulse">{icon}</span>
            )}
          </>
        )}
      </div>
    </button>
  );
};

export default AnimatedButton;