import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { supabase } from '../lib/supabase';
import { ApiService } from '../services/api';
import { ScenarioCard } from '../components/scenarios/ScenarioCard';
import { Scene, UserProgress, Collection } from '../types';
import { User } from '@supabase/supabase-js';

export function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [userProgressMap, setUserProgressMap] = useState<Map<number, UserProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'difficulty' | 'progress'>('default');
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [collectionId]);

  const checkAuthAndLoadData = async () => {
    try {
      // Check Supabase authentication
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth error:', error);
      }
      
      if (session?.user) {
        setSupabaseUser(session.user);
      }
      
      if (collectionId) {
        await loadCollectionData();
        if (session?.user) {
          loadUserProgress();
        }
      }
    } catch (error) {
      console.error('Failed to check auth and load data:', error);
    }
  };

  const loadCollectionData = async () => {
    try {
      setIsLoading(true);
      const id = parseInt(collectionId!);
      
      // Load collection info if not already in state
      if (!state.collections.currentCollection || state.collections.currentCollection.id !== id) {
        const collection = await ApiService.getCollectionById(id);
        dispatch({ type: 'SET_CURRENT_COLLECTION', payload: collection });
      }

      // Load scenarios for this collection
      const scenes = await ApiService.getScenesByCollection(id);
      dispatch({ type: 'FETCH_SCENES_SUCCESS', payload: scenes });
    } catch (error) {
      console.error('Failed to load collection data:', error);
      dispatch({ type: 'FETCH_SCENES_ERROR', payload: 'Failed to load scenarios' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      const progressList = await ApiService.getUserProgress();
      const progressMap = new Map();
      progressList.forEach(progress => {
        progressMap.set(progress.scene_id, progress);
      });
      setUserProgressMap(progressMap);
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  const handleScenarioSelect = (scene: Scene) => {
    dispatch({ type: 'SET_CURRENT_SCENE', payload: scene });
    const userProgress = userProgressMap.get(scene.id);
    
    if (userProgress && userProgress.current_sentence_index > 0) {
      navigate(`/game/${scene.id}/${userProgress.current_sentence_index}`);
    } else {
      navigate(`/game/${scene.id}/0`);
    }
  };

  const getSortedScenes = (scenes: Scene[]) => {
    const scenesWithProgress = scenes.map(scene => ({
      scene,
      progress: userProgressMap.get(scene.id)
    }));

    switch (sortBy) {
      case 'difficulty':
        return scenesWithProgress.sort((a, b) => {
          const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
          const aDiff = difficultyOrder[a.scene.difficulty_level as keyof typeof difficultyOrder] || 0;
          const bDiff = difficultyOrder[b.scene.difficulty_level as keyof typeof difficultyOrder] || 0;
          return aDiff - bDiff;
        });
      case 'progress':
        return scenesWithProgress.sort((a, b) => {
          const aProgress = a.progress?.progress_percentage || 0;
          const bProgress = b.progress?.progress_percentage || 0;
          return bProgress - aProgress;
        });
      default:
        return scenesWithProgress;
    }
  };

  const getCollectionProgress = () => {
    if (!supabaseUser || userProgressMap.size === 0) return null;
    
    const collectionScenes = state.scenes.list.filter(
      scene => scene.collection_id === parseInt(collectionId!)
    );
    const completed = collectionScenes.filter(
      scene => userProgressMap.get(scene.id)?.is_completed
    ).length;
    
    return { completed, total: collectionScenes.length };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const collection = state.collections.currentCollection;
  const scenes = state.scenes.list || [];
  const sortedScenesWithProgress = getSortedScenes(scenes);
  const collectionProgress = getCollectionProgress();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-slate-600 hover:text-emerald-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Collections</span>
            </button>

            <div className="flex items-center space-x-6">
              {supabaseUser ? (
                <span className="text-slate-600 font-medium">
                  Welcome, {supabaseUser.email}
                </span>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Sign In to Track Progress
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Collection Header */}
      {collection && (
        <section className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
              {/* Collection Image */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden flex-shrink-0">
                {collection.image_url ? (
                  <img
                    src={collection.image_url}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <span className="text-white text-3xl font-light">
                      {collection.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Collection Info */}
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <h1 className="text-4xl font-light text-slate-800 mr-4">
                    {collection.name}
                  </h1>
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
                    {collection.category}
                  </span>
                </div>
                
                {collection.description && (
                  <p className="text-slate-600 mb-6 text-lg leading-relaxed">{collection.description}</p>
                )}

                <div className="flex items-center text-sm text-slate-500 space-x-6 mb-4">
                  <span className="font-medium">{scenes.length} scenarios</span>
                  
                  {collectionProgress && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium">
                        <span className="text-emerald-600">{collectionProgress.completed}</span> of {collectionProgress.total} completed
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium text-emerald-600">
                        {Math.round((collectionProgress.completed / collectionProgress.total) * 100)}% complete
                      </span>
                    </>
                  )}
                </div>

                {/* Progress Bar */}
                {collectionProgress && (
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(collectionProgress.completed / collectionProgress.total) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <h2 className="text-3xl font-light text-slate-800">
            Learning Scenarios
          </h2>

          {/* Sort Controls */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 bg-white"
            >
              <option value="default">Default</option>
              <option value="difficulty">Difficulty</option>
              <option value="progress">Progress</option>
            </select>
          </div>
        </div>

        {/* Scenarios Grid */}
        {sortedScenesWithProgress.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No scenarios found in this collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedScenesWithProgress.map(({ scene, progress }) => (
              <ScenarioCard
                key={scene.id}
                scene={scene}
                onSelect={handleScenarioSelect}
                userProgress={progress}
              />
            ))}
          </div>
        )}

        {/* Tips for New Users */}
        {!supabaseUser && (
          <div className="mt-16 bg-emerald-50 rounded-2xl border border-emerald-100 p-8">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-emerald-600 mr-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-medium text-emerald-900 mb-2 text-lg">Sign in to track your progress</h3>
                <p className="text-emerald-700 leading-relaxed mb-4">
                  Create an account to save your learning progress, continue where you left off, 
                  and unlock achievement tracking across all scenarios.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Sign In Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}