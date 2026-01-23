import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-stone-200 rounded ${className}`}
      style={{ animationDuration: '1.5s' }}
    />
  );
};

export const FeedCardSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-white border-2 border-stone-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="flex items-center justify-between pt-4 border-t border-stone-200">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
};

export const PostGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/5]" />
      ))}
    </div>
  );
};
