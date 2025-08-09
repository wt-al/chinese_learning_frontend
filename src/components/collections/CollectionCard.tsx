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
    <div 
      onClick={() => onSelect(collection)} 
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
    >
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
          
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category Badge */}
          <div className="mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(collection.category)}`}>
              {collection.category}
            </span>
          </div>
          
          <h3 className="text-lg font-medium text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
            {collection.name}
          </h3>
          
          {collection.description && (
            <p className="text-slate-600 text-xs mb-2 line-clamp-2 leading-relaxed">
              {collection.description}
            </p>
          )}


          {/* Progress Display for Logged Users */}
          {progress && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span className="font-medium">Progress</span>
                <span className="text-emerald-600 font-medium">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {progress.completed} of {progress.total} scenarios completed
              </div>
            </div>
          )}

        </div>
    </div>
  );
}