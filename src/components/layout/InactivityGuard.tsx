'use client'
// src/components/layout/InactivityGuard.tsx
import { useInactivityLogout } from '@/hooks/useInactivityLogout'

export default function InactivityGuard() {
  useInactivityLogout()
  return null  // ne rend rien visuellement
}