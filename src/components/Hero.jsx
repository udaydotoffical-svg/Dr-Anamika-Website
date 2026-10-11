import { Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { SplitWords, Stars, Icon } from './ui.jsx'
import { clinic, hours, onlineHours } from '../content.js'
import { fmtRange } from '../lib/time.js'
import { useClinicStatus } from '../lib/hooks.js'
import { hasWebGL } from '../lib/device.js'

const HeroScene = lazy(() => import('../three/HeroScene.jsx'))

export function VialFallback() {
  const pills = []
  for (let row = 0; row < 11; row++)
    for (let col = 0; col < 6; col++) pills.push([118 + col * 13 + (row % 2) * 6.5, 318 - row * 11.5])
  return (
    <svg className="vial-fallback" viewBox="0 0 300 380" aria-hidden="true">
      <defs>
        <linearGradient id="vg" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".05" />
          <stop offset="1" stopColor="#fff" stopOpacity=".5" />
        </linearGradient>
        <radialGradient id="vglow">
          <stop offset="0" stopColor="#97d7ff" stopOpacity=".7" />
          <stop offset="1" stopColor="#97d7ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="200" r="170" fill="url(#vglow)" />
      <g transform="rotate(-12 150 200)">
        <path d="M116 92h68v12c0 6 10 10 10 20v190c0 10-8 18-18 18h-52c-10 0-18-8-18-18V124c0-10 10-14 10-20z" fill="#eef7fd" stroke="#086288" strokeOpacity=".2" />
        {pills.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke="#086288" strokeOpacity=".12" />
        ))}
        <rect x="106" y="196" width="88" height="70" fill="#fffaf0" />
        <rect x="106" y="203" width="88" height="20" fill="#086288" />
        <text x="150" y="218" textAnchor="middle" fontFamily="Fraunces Variable, serif" fontSize="12" letterSpacing="2.5" fill="#ffefc4">AVIGHNA</text>
        <text x="150" y="240" textAnchor="middle" fontFamily="Fraunces Variable, serif" fontSize="5.5" letterSpacing="1.4" fill="#086288">CLASSICAL HOMEOPATHY</text>
        <text x="150" y="254" textAnchor="middle" fontFamily="Fraunces Variable, serif" fontStyle="italic" fontSize="8" fill="#086288">Dr. Anamika</text>
        <path d="M116 92h68v12c0 6 10 10 10 20v190c0 10-8 18-18 18h-52c-10 0-18-8-18-18V124c0-10 10-14 10-20z" fill="url(#vg)" />
      </g>
      <g transform="rotate(24 96 58)">
        <rect x="62" y="40" width="72" height="38" rx="9" fill="#086288" />
        {Array.from({ length: 11 }, (_, i) => (
          <rect key={i} x={67 + i * 6} y="46" width="2" height="26" rx="1" fill="#fff" opacity=".18" />
        ))}
      </g>
      {[[214, 70], [232, 108], [200, 40], [246, 150], [70, 250], [232, 300]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={7 - (i % 3)} fill="#fff" stroke="#086288" strokeOpacity=".15" />
      ))}
    </svg>
  )
}

export default function Hero({ onSceneReady }) {
  const ref = useRef()
  const inView = useInView(ref, { margin: '0px 0px -5% 0px' })
  const webgl = useMemo(hasWebGL, [])
  const s = useClinicStatus()
  const today = hours[s.now.day]

  useEffect(() => {
    if (!webgl) onSceneReady?.()
  }, [webgl, onSceneReady])

  return (
    <section className="hero" id="top" ref={ref}>
      <div className="hero-canvas" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={null}>
            <HeroScene onReady={onSceneReady} active={inView} />
          </Suspense>
        ) : (
          <VialFallback />
        )}
      </div>

      <div className="hero-inner wrap">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
        >
          <span className="eyebrow-dot" />
          <span>
            <span className="hide-sm">Classical Homeopathy · </span>Tarsali, Vadodara
          </span>
        </motion.p>
        <SplitWords as="h1" className="hero-title" text="Healing, / *without* obstacles." immediate delay={0.55} />
        <motion.p
          className="hero-lede"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          One patient, one remedy, chosen after listening to your whole story. Gentle, individual care with{' '}
          {clinic.doctor}.
        </motion.p>
        <motion.div
          className="cta-row"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <a href="#visit" className="btn btn-dark btn-lg magnetic">
            Book a visit <Icon name="arrow" />
          </a>
          <a href="#process" className="btn btn-ghost btn-lg">
            How it works
          </a>
        </motion.div>
      </div>

      <motion.div
        className="hero-foot wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1.2 }}
      >
        <a className="foot-chip" href="#reviews">
          <Stars value={clinic.rating} size={14} />
          <span>
            <b>{clinic.rating.toFixed(1)}</b> · {clinic.reviewCount} Google reviews
          </span>
        </a>
        <div className="foot-chip hide-sm">
          <Icon name="clock" size={16} />
          <span>
            Today <b>{today.sessions.map(fmtRange).join(' · ')}</b>
          </span>
        </div>
        <div className="foot-chip hide-sm">
          <Icon name="video" size={16} />
          <span>
            Online <b>{fmtRange(onlineHours)}</b>
          </span>
        </div>
        <a href="#approach" className="scroll-cue" aria-label="Scroll to learn more">
          <span />
        </a>
      </motion.div>
    </section>
  )
}
