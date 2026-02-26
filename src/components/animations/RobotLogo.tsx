// src/components/animations/RobotLogo.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function RobotLogo() {
  const [isAnimating, setIsAnimating] = useState(true);

  return (
    <div className="relative w-24 h-24">
      {/* 机器人主体 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-400 to-green-400 
                   rounded-3xl shadow-2xl"
        animate={{
          scale: isAnimating ? [1, 1.05, 1] : 1,
          rotate: isAnimating ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* 机器人头部 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-10 h-4 
                       bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
        
        {/* 机器人眼睛 */}
        <motion.div 
          className="absolute top-6 left-1/3 w-2 h-2 bg-white rounded-full"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-6 right-1/3 w-2 h-2 bg-white rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        />
        
        {/* 机器人身体线条 */}
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-12 h-12 
                       border-2 border-white/30 rounded-xl"></div>
        
        {/* 机械臂动画 */}
        <motion.div
          className="absolute top-10 left-2 w-6 h-2 bg-gradient-to-r from-blue-300 to-blue-400 
                     rounded-r-full"
          animate={{ rotate: [0, 30, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-10 right-2 w-6 h-2 bg-gradient-to-l from-blue-300 to-blue-400 
                     rounded-l-full"
          animate={{ rotate: [0, -30, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
      </motion.div>
      
      {/* 装饰性光晕 */}
      <motion.div
        className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-green-500/20 
                   rounded-full blur-xl"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}