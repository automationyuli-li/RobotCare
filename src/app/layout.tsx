// src/app/layout.tsx - 根布局
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
//import { AuthProvider } from '@/hooks/useAuth';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RobotCare - 机器人管理协作平台',
  description: '让每一台机器人拥有可延续的"数字生命"',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}