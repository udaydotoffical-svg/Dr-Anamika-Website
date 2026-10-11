import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

// Short intro that waits for the 3D scene (never longer than ~3 s).
export default function Loader({ ready }) {
  const [minDone, setMinDone] = useState(false)
  const [maxDone, setMaxDone] = useState(false)
  const [pct, setPct] = useState(0)
  const readyRef = useRef(ready)
  readyRef.current = ready

  useEffect(() => {
    const a = setTimeout(() => setMinDone(true), 1300)
    const b = setTimeout(() => setMaxDone(true), 3200)
    let raf
    const start = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - start) / 1400)
      const cap = readyRef.current ? 1 : 0.92
      setPct(Math.round(100 * (1 - Math.pow(1 - k, 3)) * cap))
      if (k < 1 || !readyRef.current) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      cancelAnimationFrame(raf)
    }
  }, [])

  const show = !((ready && minDone) || maxDone)

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', show)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loader"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden="true"
        >
          <div className="loader-inner">
            <svg viewBox="0 0 40 40" className="loader-mark">
              <motion.path
                d="M8 32C8 18 18 8 32 8C32 22 22 32 8 32Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.9"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="21.2"
                cy="19"
                r="3"
                fill="var(--sky)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 14 }}
              />
            </svg>
            <motion.div
              className="loader-word"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8 }}
            >
              Avighna
            </motion.div>
            <div className="loader-bar">
              <span style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            <div className="loader-pct">{String(pct).padStart(3, '0')}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
