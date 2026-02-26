// src/components/ui/Input.tsx
'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
  variant?: 'default' | 'filled' | 'outlined';
}

export function Input({ 
  icon, 
  label, 
  error, 
  variant = 'default', 
  type = 'text',
  ...props 
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  const variants = {
    default: 'bg-white border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
    filled: 'bg-gray-50 border-gray-200 hover:bg-gray-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
    outlined: 'bg-transparent border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
  };
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700 flex items-center">
          {icon && <span className="mr-2 text-gray-400">{icon}</span>}
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type={inputType}
          className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 
                     placeholder:text-gray-400 text-gray-900 focus:outline-none 
                     ${variants[variant]} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          {...props}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 
                       hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
          {error}
        </p>
      )}
    </div>
  );
}