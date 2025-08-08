import React from 'react';
import { Scene, UserProgress } from '../../types';

interface ScenarioCardProps {
  scene: Scene;
  onSelect: (scene: Scene) => void;
  userProgress?: UserProgress;
}

export function ScenarioCard({ scene, onSelect, userProgress }: ScenarioCardProps) {
  const getButtonText = () => {
    if (!userProgress) return 'Start';
    if (userProgress.progress_percentage === 0) return 'Start';
    if (userProgress.is_completed) return 'Review';
    return 'Continue';
  };

  const getButtonColor = () => {
    if (!userProgress) return 'bg-blue-600 hover:bg-blue-700';
    if (userProgress.is_completed) return 'bg-green-600 hover:bg-green-700';
    if (userProgress.progress_percentage > 0) return 'bg-orange-600 hover:bg-orange-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '~5 min';
    return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
  };

  const formatLastStudied = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 group"
      onClick={() => onSelect(scene)}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex-1">
            {scene.name}
          </h3>
          
          {/* Difficulty Badge */}
          {scene.difficulty_level && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 capitalize ${getDifficultyColor(scene.difficulty_level)}`}>
              {scene.difficulty_level}
            </span>
          )}
        </div>

        {/* Meta Information */}
        <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
          {/* Estimated Time */}
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(scene.estimated_time)}</span>
          </div>

          {/* Sentence Count */}
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>{scene.sentence_ids?.length || 0} sentences</span>
          </div>
        </div>

        {/* Progress Section for Logged Users */}
        {userProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{userProgress.progress_percentage}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  userProgress.is_completed 
                    ? 'bg-green-500' 
                    : userProgress.progress_percentage > 0 
                      ? 'bg-orange-500' 
                      : 'bg-gray-300'
                }`}
                style={{ width: `${userProgress.progress_percentage}%` }}
              />
            </div>

            {/* Additional Progress Info */}
            <div className="text-xs text-gray-500">
              {userProgress.is_completed ? (
                <span className="flex items-center text-green-600">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Completed {userProgress.completion_time_formatted && `in ${userProgress.completion_time_formatted}`}
                </span>
              ) : userProgress.progress_percentage > 0 ? (
                <span>
                  {userProgress.current_sentence_index} of {userProgress.total_sentences} sentences
                  {formatLastStudied(userProgress.last_studied_at) && (
                    <span className="ml-2">• Last studied {formatLastStudied(userProgress.last_studied_at)}</span>
                  )}
                </span>
              ) : (
                <span>Ready to start</span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button 
          className={`w-full text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${getButtonColor()}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(scene);
          }}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}