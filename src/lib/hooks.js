import { useEffect, useState } from 'react'
import { clinicNow, status } from './time.js'

// Live open/closed state, refreshed every 30 s.
export function useClinicStatus() {
  const [s, setS] = useState(() => ({ ...status(), now: clinicNow() }))
  useEffect(() => {
    const id = setInterval(() => setS({ ...status(), now: clinicNow() }), 30000)
    return () => clearInterval(id)
  }, [])
  return s
}

export function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [threshold])
  return scrolled
}
