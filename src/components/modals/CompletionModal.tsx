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

  const getStarRating = (accuracy: number) => {
    if (accuracy >= 95) return 5;
    if (accuracy >= 85) return 4;
    if (accuracy >= 75) return 3;
    if (accuracy >= 60) return 2;
    return 1;
  };

  const renderStars = (starCount: number) => {
    const stars = [];
    // Arc settings
    const radius = 100; // Radius of the arc
    const startAngle = -60; // Start angle in degrees (leftmost star)
    const endAngle = 60;   // End angle in degrees (rightmost star)
    const angleStep = (endAngle - startAngle) / 4; // Angle between each star

    for (let i = 0; i < 5; i++) {
      const angle = startAngle + (i * angleStep);
      const radian = (angle * Math.PI) / 180;
      
      // Calculate position on the arc
      const x = Math.sin(radian) * radius;
      const y = -Math.cos(radian) * radius + radius; // Offset to make arc downward
      
      // Calculate rotation to make star "point" toward center
      const rotation = -angle;
      
      const transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;

      if (i < starCount) {
        // Yellow star for earned stars
        stars.push(
          <div key={i} className="absolute" style={{ transform }}>
            <img
              src="https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/yellow-star.png"
              alt="Earned Star"
              className="w-32 h-32 object-contain"
            />
          </div>
        );
      } else {
        // Platinum star for unearned stars
        stars.push(
          <div key={i} className="absolute" style={{ transform }}>
            <img
              src="https://pub-db47198bc7c9439a8a89961773b1d1cd.r2.dev/elements/platinum-star.png"
              alt="Unearned Star"
              className="w-32 h-32 object-contain opacity-50"
            />
          </div>
        );
      }
    }
    return stars;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto text-white" style={{ backgroundColor: '#3D5E87' }}>
        {/* Star Rating Header */}
        <div className="text-white p-6 pt-8 pb-10 text-center" style={{ backgroundColor: '#3D5E87' }}>
          <div className="relative flex justify-center items-center h-40 w-full">
            {renderStars(getStarRating(data.statistics.accuracy))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">

          {/* Statistics */}
          <div className="bg-white bg-opacity-10 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-white mb-3">Your Performance</h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Time */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatTime(data.statistics.timeSpent)}
                </div>
                <div className="text-sm text-white opacity-70">Time taken</div>
              </div>

              {/* Accuracy */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {data.statistics.accuracy}%
                </div>
                <div className="text-sm text-white opacity-70">Accuracy</div>
              </div>

              {/* Correct Answers */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {data.statistics.correctAnswers}
                </div>
                <div className="text-sm text-white opacity-70">Correct</div>
              </div>

              {/* Hints Used */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {data.statistics.hintsUsed}
                </div>
                <div className="text-sm text-white opacity-70">Hints used</div>
              </div>
            </div>

            {/* Accuracy Message */}
            <div className="text-center mt-4">
              <p className="font-medium text-white">
                {getAccuracyMessage(data.statistics.accuracy)}
              </p>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Continue to Next */}
            {data.nextSceneId && data.collectionProgress.completed < data.collectionProgress.total && (
              <button 
                onClick={onContinue}
                className="w-full bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center border border-white border-opacity-30"
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
              className="w-full bg-white bg-opacity-10 hover:bg-white hover:bg-opacity-20 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 border border-white border-opacity-20"
            >
              Review This Scenario
            </button>

            {/* Back to Collection */}
            <button 
              onClick={onBackToCollection}
              className="w-full bg-white bg-opacity-10 hover:bg-white hover:bg-opacity-20 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 border border-white border-opacity-20"
            >
              Back to Collection
            </button>
          </div>

          {/* Social Sharing (Optional) */}
          {data.statistics.accuracy >= 90 && (
            <div className="mt-6 pt-6 border-t border-white border-opacity-20">
              <p className="text-center text-white opacity-80 text-sm mb-3">Share your achievement!</p>
              <div className="flex justify-center space-x-3">
                <button className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm border border-white border-opacity-30">
                  Share on Twitter
                </button>
                <button className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm border border-white border-opacity-30">
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