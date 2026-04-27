'use client'

import React from 'react'

// ─── Primitives ──────────────────────────────────────────────────────────────

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] ${className}`}
      style={style}
    />
  )
}

export function SkeletonText({ width = 'w-24', height = 'h-3' }: { width?: string; height?: string }) {
  return <Bone className={`${width} ${height}`} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[#0d0e16] p-5 space-y-3 ${className}`}>
      <Bone className="h-3 w-20" />
      <Bone className="h-7 w-28" />
      <Bone className="h-2.5 w-16" />
    </div>
  )
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[#0d0e16] p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Bone className="h-4 w-28" />
          <Bone className="h-2.5 w-40" />
        </div>
        <Bone className="h-6 w-20" />
      </div>
      {/* Fake chart bars */}
      <div className="flex items-end gap-1.5 h-48 pt-4">
        {[40, 65, 30, 80, 55, 70, 45, 90, 60, 35, 75, 50, 85, 40, 65, 55, 70, 45, 80, 60].map((h, i) => (
          <Bone key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <Bone className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-20" />
        <Bone className="h-2.5 w-32" />
      </div>
      <Bone className="h-4 w-16" />
    </div>
  )
}

// ─── Compositions ────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-3 w-32" />
        </div>
        <div className="flex gap-3">
          <Bone className="h-9 w-24 rounded-xl" />
          <Bone className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Equity chart */}
      <SkeletonChart />

      {/* 4 intelligence cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="min-h-[140px]" />
        ))}
      </div>

      {/* Recent trades */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e16] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
          <Bone className="h-4 w-28" />
          <Bone className="h-3 w-16" />
        </div>
        {[...Array(5)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}

export function AnalyticsSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-56" />
          <Bone className="h-3.5 w-72" />
        </div>
        <div className="flex gap-3">
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-36 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Brief panel */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e16] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <Bone className="h-5 w-40" />
            <Bone className="h-3 w-56" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0a0b12] p-4 min-w-[180px] space-y-2">
                <Bone className="h-2.5 w-16" />
                <Bone className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="min-h-[160px]" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SkeletonChart className="min-h-[400px]" />
        <SkeletonChart className="min-h-[400px]" />
      </div>
    </div>
  )
}

export function TradesListSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-24" />
          <Bone className="h-3 w-40" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-44 rounded-xl" />
          <Bone className="h-9 w-9 rounded-xl" />
          <Bone className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Bone key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d0e16] overflow-hidden">
        <div className="px-4 py-3 bg-[#0a0b12] border-b border-white/[0.04]">
          <Bone className="h-3 w-full max-w-2xl" />
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`px-4 py-3.5 flex items-center gap-4 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
            <Bone className="w-3.5 h-3.5 rounded flex-shrink-0" />
            <Bone className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-16" />
              <Bone className="h-2 w-24" />
            </div>
            <Bone className="h-5 w-12 rounded-md" />
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-16" />
            <Bone className="h-4 w-16" />
            <Bone className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-3 w-32" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-10 w-20 rounded-xl" />
          <Bone className="h-10 w-20 rounded-xl" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-9 rounded-xl" />
        <Bone className="h-9 w-9 rounded-xl" />
        <Bone className="h-9 w-20 rounded-xl" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-white/[0.06] bg-[#151823] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-white/[0.06]">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="p-4 flex justify-center">
              <Bone className="h-3 w-8" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="min-h-[120px] p-4 border border-white/[0.03] space-y-2">
              <Bone className="h-4 w-6" />
              <Bone className="h-5 w-16" />
              <Bone className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
