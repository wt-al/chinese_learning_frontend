import React from 'react';
import { CompletionModalData } from '../../types';

interface CompletionModalProps {
  isOpen: boolean;
  data?: CompletionModalData;
  onClose: () => void;
  onContinue: () => void;
  onReview: () => void;
  onBackToCollection: () => void;
}

export function CompletionModal({ 
  isOpen, 
  data, 
  onClose, 
  onContinue, 
  onReview, 
  onBackToCollection 
}: CompletionModalProps) {
  if (!isOpen || !data) return null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyMessage = (accuracy: number) => {
    if (accuracy >= 95) return 'Outstanding!';
    if (accuracy >= 85) return 'Great job!';
    if (accuracy >= 70) return 'Good work!';
    return 'Keep practicing!';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-1">Congratulations!</h2>
          <p className="text-green-100">You completed the scenario</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Scenario Info */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{data.sceneName}</h3>
            <p className="text-gray-600">from {data.collectionName}</p>
          </div>

          {/* Statistics */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Your Performance</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Time */}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(data.statistics.timeSpent)}
                </div>
                <div className="text-sm text-gray-500">Time taken</div>
              </div>

              {/* Accuracy */}
              <div className="text-center">
                <div className={`text-2xl font-bold ${getAccuracyColor(data.statistics.accuracy)}`}>
                  {data.statistics.accuracy}%
                </div>
                <div className="text-sm text-gray-500">Accuracy</div>
              </div>

              {/* Correct Answers */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.statistics.correctAnswers}
                </div>
                <div className="text-sm text-gray-500">Correct</div>
              </div>

              {/* Hints Used */}
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {data.statistics.hintsUsed}
                </div>
                <div className="text-sm text-gray-500">Hints used</div>
              </div>
            </div>

            {/* Accuracy Message */}
            <div className="text-center mt-4">
              <p className={`font-medium ${getAccuracyColor(data.statistics.accuracy)}`}>
                {getAccuracyMessage(data.statistics.accuracy)}
              </p>
            </div>
          </div>

          {/* Collection Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Collection Progress</span>
              <span>
                {data.collectionProgress.completed} of {data.collectionProgress.total} scenarios
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(data.collectionProgress.completed / data.collectionProgress.total) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Continue to Next */}
            {data.nextSceneId && data.collectionProgress.completed < data.collectionProgress.total && (
              <button 
                onClick={onContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <span>Continue to Next Scenario</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}

            {/* Review This Scenario */}
            <button 
              onClick={onReview}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Review This Scenario
            </button>

            {/* Back to Collection */}
            <button 
              onClick={onBackToCollection}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Back to Collection
            </button>
          </div>

          {/* Social Sharing (Optional) */}
          {data.statistics.accuracy >= 90 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-gray-600 text-sm mb-3">Share your achievement!</p>
              <div className="flex justify-center space-x-3">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                  Share on Twitter
                </button>
                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
                  Share on WeChat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}