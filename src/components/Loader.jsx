import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Logo from './Logo.jsx'

// Short intro that waits for the 3D scene (never longer than ~3 s).
export default function Loader({ ready }) {
  const [minDone, setMinDone] = useState(false)
  const [maxDone, setMaxDone] = useState(false)
  const [pct, setPct] = useState(0)
  const [fonts, setFonts] = useState(false)
  const readyRef = useRef(ready)
  readyRef.current = ready

  useEffect(() => {
    const f = document.fonts?.load
      ? Promise.all([
          document.fonts.load('400 40px "Fraunces Variable"'),
          document.fonts.load('italic 400 40px "Fraunces Variable"'),
          document.fonts.load('500 16px "Manrope Variable"'),
        ])
      : Promise.resolve()
    f.catch(() => {}).then(() => setFonts(true))
  }, [])

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

  const show = !((ready && minDone && fonts) || maxDone)

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
            <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
              <Logo ring className="loader-mark" />
            </motion.div>
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
