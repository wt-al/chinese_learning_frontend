import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { supabase } from '../lib/supabase';
import { ApiService } from '../services/api';
import { CollectionCard } from '../components/collections/CollectionCard';
import { Collection, UserProgress } from '../types';
import { User } from '@supabase/supabase-js';

export default function HomePage() {
  const { state, dispatch } = useAppContext();
  const [userProgressMap, setUserProgressMap] = useState<Map<number, UserProgress>>(new Map());
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  // 简化的认证检查 - 只检查一次
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('HomePage: 检查认证状态...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('HomePage: 会话信息:', { session, error });
        
        if (error) {
          console.error('HomePage: 认证错误:', error);
          navigate('/login', { replace: true });
        } else if (session?.user) {
          console.log('HomePage: 用户已登录:', session.user.email);
          setSupabaseUser(session.user);
        } else {
          console.log('HomePage: 用户未登录，重定向到登录页');
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('HomePage: Auth error:', error);
        navigate('/login', { replace: true });
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []); // 空依赖数组 - 只运行一次

  useEffect(() => {
    loadCollections();
    if (supabaseUser) {
      console.log('用户已登录，尝试加载用户进度');
      loadUserProgress();
    }
  }, [supabaseUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const collections = await ApiService.getCollections();
      dispatch({ type: 'FETCH_COLLECTIONS_SUCCESS', payload: collections });
    } catch (error) {
      console.error('Failed to load collections:', error);
      // Fallback: show demo collections when backend is not available
      const demoCollections: Collection[] = [
        {
          id: 1,
          name: "Daily Conversations",
          description: "Essential conversations for everyday situations",
          category: "Daily",
          image_url: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=400&h=300&fit=crop",
          scene_count: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          name: "Beginner Basics",
          description: "Perfect starting point for Chinese learners",
          category: "Beginner",
          image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop",
          scene_count: 8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          name: "Business Chinese",
          description: "Professional communication in Chinese workplace",
          category: "Business",
          image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
          scene_count: 6,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      dispatch({ type: 'FETCH_COLLECTIONS_SUCCESS', payload: demoCollections });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      console.log('开始加载用户进度...');
      const progressList = await ApiService.getUserProgress();
      console.log('用户进度加载成功:', progressList);
      
      const progressMap = new Map();
      progressList.forEach(progress => {
        progressMap.set(progress.scene_id, progress);
      });
      setUserProgressMap(progressMap);
    } catch (error) {
      console.error('Failed to load user progress:', error);
      console.log('用户进度加载失败，但不影响页面显示');
      // 不要因为用户进度加载失败就阻塞整个页面
      // 用户仍然可以查看课程，只是没有进度信息
    }
  };

  const handleCollectionClick = (collection: Collection) => {
    dispatch({ type: 'SET_CURRENT_COLLECTION', payload: collection });
    navigate(`/collection/${collection.id}`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // 清理本地状态
      dispatch({ type: 'LOGOUT' });
      setUserProgressMap(new Map());
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Safe filtering with null check
  const collectionsList = state.collections?.list || [];
  const filteredCollections = Array.isArray(collectionsList) ? collectionsList.filter(collection => {
    if (filter === 'all') return true;
    return collection.category.toLowerCase() === filter.toLowerCase();
  }) : [];

  const categories = ['all', 'daily', 'business', 'beginner'];
  const categoryLabels: { [key: string]: string } = {
    all: 'All',
    daily: 'Daily',
    business: 'Business', 
    beginner: 'Beginner'
  };

  // 认证加载中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 数据加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl font-bold">中</span>
              </div>
              <h1 className="text-2xl font-light text-slate-800">Chinese Learning Platform</h1>
            </div>
            
            <div className="flex items-center space-x-6">
              {supabaseUser ? (
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors duration-200"
                  >
                    {supabaseUser.user_metadata?.avatar_url ? (
                      <img 
                        src={supabaseUser.user_metadata.avatar_url} 
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {supabaseUser.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 
                           supabaseUser.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <span className="text-slate-700 font-medium">
                      {supabaseUser.user_metadata?.full_name?.split(' ').pop() || 
                       supabaseUser.user_metadata?.name?.split(' ').pop() ||
                       supabaseUser.email?.split('@')[0] || 'User'}
                    </span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // TODO: Navigate to history page
                          console.log('Navigate to history');
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>History</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 text-slate-600 hover:text-emerald-600 transition-colors duration-200 font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-3">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  filter === category
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-emerald-200'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>

        {/* Collection Grid */}
        {filteredCollections.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No collections available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCollections.map(collection => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onSelect={() => handleCollectionClick(collection)}
              />
            ))}
          </div>
        )}

        {/* User Progress Summary for Authenticated Users */}
        {state.user.isAuthenticated && userProgressMap.size > 0 && (
          <div className="mt-16 bg-white rounded-2xl border border-slate-100 p-8">
            <h3 className="text-2xl font-light text-slate-800 mb-8">Your Learning Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-light text-emerald-600 mb-2">
                  {Array.from(userProgressMap.values()).filter(p => p.is_completed).length}
                </div>
                <div className="text-slate-600 font-medium">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-amber-600 mb-2">
                  {Array.from(userProgressMap.values()).filter(p => p.current_sentence_index > 0 && !p.is_completed).length}
                </div>
                <div className="text-slate-600 font-medium">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-slate-700 mb-2">
                  {userProgressMap.size}
                </div>
                <div className="text-slate-600 font-medium">Total Started</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}