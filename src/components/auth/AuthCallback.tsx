import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../common/LoadingSpinner'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    
    const handleAuthCallback = async () => {
      if (!mounted) return
      
      try {
        console.log('🔄 AuthCallback: 开始处理OAuth回调')
        console.log('📍 当前完整URL:', window.location.href)
        console.log('🔗 URL Hash:', window.location.hash)
        console.log('❓ URL Search:', window.location.search)
        
        // Supabase会自动处理URL中的认证信息
        // 我们需要等待一下让它完成处理
        console.log('⏳ 等待Supabase处理认证信息...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        if (!mounted) return
        
        console.log('🔍 检查认证会话...')
        const { data, error } = await supabase.auth.getSession()
        
        console.log('📊 会话结果:', {
          hasSession: !!data.session,
          hasUser: !!data.session?.user,
          userEmail: data.session?.user?.email,
          error: error
        })
        
        if (error) {
          console.error('❌ 会话错误:', error)
          if (mounted) navigate('/login?error=session_error', { replace: true })
          return
        }

        if (data.session && data.session.user) {
          console.log('✅ OAuth登录成功！用户:', data.session.user.email)
          if (mounted) {
            console.log('🏠 重定向到首页...')
            navigate('/', { replace: true })
          }
        } else {
          console.log('❌ 未找到有效会话')
          if (mounted) navigate('/login?error=no_session', { replace: true })
        }
        
      } catch (error) {
        console.error('💥 AuthCallback错误:', error)
        if (mounted) navigate('/login?error=callback_exception', { replace: true })
      }
    }

    handleAuthCallback()
    
    return () => {
      mounted = false
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">正在处理登录...</p>
      </div>
    </div>
  )
}