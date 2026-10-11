import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { steps } from '../content.js'
import { hasWebGL } from '../lib/device.js'
import { scrollToY } from '../lib/scroll.js'

const StoryScene = lazy(() => import('../three/StoryScene.jsx'))

export default function Story() {
  const section = useRef()
  const progress = useRef(0)
  const [step, setStep] = useState(0)
  const near = useInView(section, { margin: '20% 0px 20% 0px' })
  const webgl = useMemo(hasWebGL, [])

  useEffect(() => {
    const on = () => {
      const el = section.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = Math.min(0.999, Math.max(0, -r.top / total))
      progress.current = p
      setStep(Math.min(steps.length - 1, Math.floor(p * steps.length)))
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  const jump = (i) => {
    const el = section.current
    const total = el.offsetHeight - window.innerHeight
    const top = el.getBoundingClientRect().top + window.scrollY + total * ((i + 0.5) / steps.length)
    scrollToY(top)
  }

  const s = steps[step]

  return (
    <section className="story" id="process" ref={section} style={{ height: `${steps.length * 85 + 100}vh` }}>
      <div className="story-sticky">
        <div className="story-canvas" aria-hidden="true">
          {webgl && (near || step > 0) ? (
            <Suspense fallback={null}>
              <StoryScene progress={progress} active={near} />
            </Suspense>
          ) : null}
        </div>
        <div className="story-shade" aria-hidden="true" />
        <div className="wrap story-grid">
          <div className="story-panel">
            <p className="eyebrow eyebrow-light">
              <span className="eyebrow-dot" /> Your first visit
            </p>
            <h2 className="h2 story-title">
              From many symptoms <br />
              to <span className="em">one remedy.</span>
            </h2>
            <div className="story-step" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="story-kicker">
                    <span className="story-n">{s.n}</span> {s.kicker}
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <ol className="story-nav">
              {steps.map((x, i) => (
                <li key={x.n}>
                  <button className={i === step ? 'is-active' : i < step ? 'is-done' : ''} onClick={() => jump(i)}>
                    <span className="bar">
                      <span />
                    </span>
                    <span className="lbl">{x.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
