import React from 'react';
import { Collection } from '../../types';

interface CollectionCardProps {
  collection: Collection;
  onSelect: (collection: Collection) => void;
  progress?: {
    completed: number;
    total: number;
  };
}

export function CollectionCard({ collection, onSelect, progress }: CollectionCardProps) {
  const progressPercentage = progress 
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const getButtonText = () => {
    if (!progress) return 'Start Learning';
    if (progress.completed === 0) return 'Start Learning';
    if (progress.completed === progress.total) return 'Review';
    return 'Continue';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Daily: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      Beginner: 'bg-slate-50 text-slate-700 border border-slate-200',
      Business: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      Travel: 'bg-amber-50 text-amber-700 border border-amber-100',
      Shopping: 'bg-rose-50 text-rose-700 border border-rose-100'
    };
    return colors[category as keyof typeof colors] || 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-emerald-100 transition-all duration-300 cursor-pointer group">
      <div onClick={() => onSelect(collection)} className="block">
        {/* Cover Image */}
        <div className="h-48 bg-slate-100 relative overflow-hidden">
          {collection.image_url ? (
            <img
              src={collection.image_url}
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-white text-4xl font-light">
                {collection.name.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${getCategoryColor(collection.category)}`}>
              {collection.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-medium text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">
            {collection.name}
          </h3>
          
          {collection.description && (
            <p className="text-slate-600 text-sm mb-6 line-clamp-2 leading-relaxed">
              {collection.description}
            </p>
          )}

          {/* Scene Count */}
          <div className="flex items-center text-slate-500 text-sm mb-6">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">{collection.scene_count || 0} scenarios</span>
          </div>

          {/* Progress Display for Logged Users */}
          {progress && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span className="font-medium">Progress</span>
                <span className="text-emerald-600 font-medium">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {progress.completed} of {progress.total} scenarios completed
              </div>
            </div>
          )}

          {/* Action Button */}
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}