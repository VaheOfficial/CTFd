import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper functions for the existing challenge pages
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'text-emerald-400'
    case 'medium':
      return 'text-lime-400'
    case 'hard':
      return 'text-yellow-400'
    case 'insane':
      return 'text-rose-400'
    default:
      return 'text-slate-400'
  }
}

export function getTrackColor(track: string): string {
  switch (track.toLowerCase()) {
    case 'identity_cloud':
      return '#3b82f6' // blue
    case 'intel_recon':
      return '#10b981' // emerald
    case 'c2_egress':
      return '#8b5cf6' // violet
    case 'access_exploit':
      return '#ef4444' // red
    case 'detect_forensics':
      return '#f59e0b' // amber
    default:
      return '#6b7280'
  }
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k`
  }
  return points.toString()
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

// Mock API function for compatibility with existing pages
export async function apiGet(endpoint: string) {
  // This would be replaced with actual API calls
  return { data: [], error: null }
}

export async function apiPost(endpoint: string, data: any) {
  // This would be replaced with actual API calls
  return { data: null, error: null }
}

export function getDifficultyVariant(difficulty: string): "easy" | "medium" | "hard" | "insane" | "outline" {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'easy'
    case 'medium':
      return 'medium'
    case 'hard':
      return 'hard'
    case 'insane':
      return 'insane'
    default:
      return 'outline'
  }
}
