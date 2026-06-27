import React from 'react';

export function PageSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4" dir="rtl">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-64 bg-slate-800/60 rounded-md" />
        </div>
        <div className="h-10 w-36 bg-slate-800 rounded-xl" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-slate-800/40 rounded-2xl border border-slate-800/80 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-8 w-8 bg-slate-800 rounded-lg" />
            </div>
            <div className="h-6 w-32 bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-slate-800/20 rounded-2xl border border-slate-800/80 p-5 space-y-4">
          <div className="h-5 w-40 bg-slate-800 rounded" />
          <div className="space-y-2 pt-4">
            <div className="h-8 bg-slate-800/60 rounded-lg w-full" />
            <div className="h-8 bg-slate-800/40 rounded-lg w-full" />
            <div className="h-8 bg-slate-800/40 rounded-lg w-full" />
            <div className="h-8 bg-slate-800/40 rounded-lg w-full" />
          </div>
        </div>
        <div className="h-96 bg-slate-800/20 rounded-2xl border border-slate-800/80 p-5 space-y-4">
          <div className="h-5 w-32 bg-slate-800 rounded" />
          <div className="flex justify-center items-center h-64">
            <div className="rounded-full bg-slate-800/50 h-40 w-40 border-4 border-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
