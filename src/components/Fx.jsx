import { useEffect, useRef } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { prefersReducedMotion } from '../lib/device.js'

// Thin reading-progress line at the very top of the page.
export function ProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })
  return <motion.div className="progress" style={{ scaleX }} aria-hidden="true" />
}

// Soft ring that follows the mouse and grows over links and buttons. Mouse only, never on touch.
export function Cursor() {
  const ring = useRef()
  const dot = useRef()
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return
    document.documentElement.classList.add('has-cursor')
    let x = -100, y = -100, rx = -100, ry = -100, raf
    const move = (e) => {
      x = e.clientX
      y = e.clientY
      dot.current.style.transform = `translate(${x}px, ${y}px)`
      const hot = e.target.closest?.('a, button, input, textarea, [role=radio], .spot')
      ring.current.classList.toggle('is-hot', !!hot)
    }
    const tick = () => {
      rx += (x - rx) * 0.16
      ry += (y - ry) * 0.16
      ring.current.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
