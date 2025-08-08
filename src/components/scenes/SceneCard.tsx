import React from 'react';
import { Scene, UserProgress } from '../../types';

interface SceneCardProps {
  scene: Scene;
  userProgress?: UserProgress;
  onClick: () => void;
}

export default function SceneCard({ scene, userProgress, onClick }: SceneCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'daily':
      case '日常':
        return 'bg-blue-100 text-blue-800';
      case 'business':
      case '商务':
        return 'bg-green-100 text-green-800';
      case 'beginner':
      case 'basic':
      case '初级':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCompletionTime = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分钟`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border border-gray-200"
    >
      {/* Scene Title and Category */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex-1">
          {scene.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(scene.category)}`}>
          {scene.category}
        </span>
      </div>

      {/* Progress Section for Authenticated Users */}
      {userProgress && (
        <div className="mb-4">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{userProgress.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${userProgress.progress_percentage}%` }}
            />
          </div>

          {/* Completion Status */}
          {userProgress.is_completed ? (
            <div className="flex items-center text-green-600 text-sm mb-2">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Completed</span>
              {userProgress.completion_time_formatted && (
                <span className="ml-2 text-gray-500">
                  ({formatCompletionTime(userProgress.completion_time_seconds)})
                </span>
              )}
            </div>
          ) : (
            <div className="text-blue-600 text-sm mb-2">
              {userProgress.current_sentence_index > 0 ? 'In Progress' : 'Not Started'}
            </div>
          )}

          {/* Last Studied */}
          {userProgress.last_studied_at && (
            <div className="text-xs text-gray-500">
              Last studied: {new Date(userProgress.last_studied_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {scene.sentence_ids.length} sentences
        </div>
        
        <div className="flex space-x-2">
          {userProgress?.is_completed ? (
            <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
              Review
            </button>
          ) : userProgress?.current_sentence_index > 0 ? (
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Continue
            </button>
          ) : (
            <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
              Start Learning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}