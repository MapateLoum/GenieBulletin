// src/hooks/useInactivityLogout.ts
'use client'
import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'

const INACTIVITY_MS = 2 * 60 * 60 * 1000  // 2 heures
const WARNING_MS    = 5 * 60 * 1000        // avertissement 5 min avant

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

export function useInactivityLogout() {
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningToastId = useRef<string | null>(null)

  function resetTimers() {
    // Annuler les timers précédents
    if (logoutTimer.current)  clearTimeout(logoutTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)

    // Dismiss le toast d'avertissement s'il est affiché
    if (warningToastId.current) {
      toast.dismiss(warningToastId.current)
      warningToastId.current = null
    }

    // Timer d'avertissement : 5 min avant la déconnexion
    warningTimer.current = setTimeout(() => {
      warningToastId.current = toast(
        '⚠️ Vous serez déconnecté dans 5 minutes pour inactivité.',
        { duration: 5 * 60 * 1000, icon: '🔒' }
      )
    }, INACTIVITY_MS - WARNING_MS)

    // Timer de déconnexion
    logoutTimer.current = setTimeout(() => {
      toast.dismiss()
      toast.error('Session expirée — veuillez vous reconnecter.', { duration: 4000 })
      setTimeout(() => signOut({ callbackUrl: '/login' }), 1500)
    }, INACTIVITY_MS)
  }

  useEffect(() => {
    resetTimers()
    EVENTS.forEach(ev => window.addEventListener(ev, resetTimers, { passive: true }))

    return () => {
      if (logoutTimer.current)  clearTimeout(logoutTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
      EVENTS.forEach(ev => window.removeEventListener(ev, resetTimers))
    }
  }, [])
}