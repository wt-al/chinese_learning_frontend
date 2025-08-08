import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
  }

  if (!user) return null

  // 返回一个简单的用户信息栏，不包含重复的标题
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-end items-center py-2">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-600 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}