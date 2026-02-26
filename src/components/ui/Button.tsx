// src/components/ui/Button.tsx
'use client';

import { Loader2 } from 'lucide-react';
import { motion, MotionProps } from 'framer-motion';
import React from 'react';

// 定义自定义的 button props
type CustomButtonProps = {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
};

// 从 React.ButtonHTMLAttributes 中排除与 framer-motion 冲突的 props
type OmittedButtonProps = 
  | 'onAnimationStart' 
  | 'onAnimationEnd' 
  | 'onDragStart' 
  | 'onDragEnd' 
  | 'onDrag';

// 组合所有 props
type ButtonProps = CustomButtonProps & 
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, OmittedButtonProps>;

// 提取 MotionProps 中我们需要的部分
type MotionButtonProps = {
  whileTap?: MotionProps['whileTap'];
  whileHover?: MotionProps['whileHover'];
  animate?: MotionProps['animate'];
  transition?: MotionProps['transition'];
  initial?: MotionProps['initial'];
  exit?: MotionProps['exit'];
};

// 最终组合
type FinalButtonProps = ButtonProps & MotionButtonProps;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  whileTap,
  whileHover,
  animate,
  transition,
  initial,
  exit,
  ...props
}: FinalButtonProps) {
  const baseStyles = 'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600 focus:ring-blue-500/50 shadow-lg hover:shadow-xl',
    secondary: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 focus:ring-gray-500/50',
    outline: 'border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:ring-blue-500/50 bg-transparent',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500/50'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  // 动画配置
  const motionConfig = {
    whileTap: whileTap || { scale: disabled || loading ? 1 : 0.98 },
    whileHover: whileHover || { 
      scale: disabled || loading ? 1 : 1.02,
      transition: { duration: 0.2 }
    },
    animate,
    transition,
    initial,
    exit
  };
  
  return (
    <motion.button
      {...motionConfig}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
        relative
      `}
      disabled={disabled || loading}
      {...props as any} // 使用类型断言解决剩余 props
    >
      <div className="flex items-center justify-center space-x-2">
        {loading && (
          <Loader2 className="w-5 h-5 animate-spin" />
        )}
        {!loading && icon && (
          <span className="w-5 h-5">{icon}</span>
        )}
        <span>{children}</span>
      </div>
    </motion.button>
  );
}