import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { services } from '../content.js'
import { Icon, Reveal, SplitWords } from './ui.jsx'

const art = [
  // homeopathy: a vial and pills
  <g key="0" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="30" y="20" width="20" height="46" rx="7" />
    <path d="M33 20v-6h14v6M30 44h20" />
    <circle cx="40" cy="55" r="2.6" fill="currentColor" />
    <circle cx="34.5" cy="52" r="2.2" />
    <circle cx="45.5" cy="52" r="2.2" />
    <circle cx="66" cy="26" r="3" />
    <circle cx="62" cy="38" r="2" />
  </g>,
  // counselling: two overlapping speech shapes
  <g key="1" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M12 22a8 8 0 0 1 8-8h26a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H30l-10 8v-8a8 8 0 0 1-8-8z" />
    <path d="M60 34h4a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8v8l-9-8H44" />
    <circle cx="25" cy="29" r="1.6" fill="currentColor" />
    <circle cx="33" cy="29" r="1.6" fill="currentColor" />
    <circle cx="41" cy="29" r="1.6" fill="currentColor" />
  </g>,
  // online: a screen with a pulse
  <g key="2" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="10" y="18" width="60" height="38" rx="6" />
    <path d="M30 66h20M40 56v10" />
    <path d="M20 38h10l4-9 6 17 5-11 3 3h12" />
  </g>,
]

// Card that tilts toward the pointer and lifts its content a little (desktop only).
function TiltCard({ children, className }) {
  const ref = useRef()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 220, damping: 22 })
  const sy = useSpring(py, { stiffness: 220, damping: 22 })
  const rx = useTransform(sy, [-0.5, 0.5], [6, -6])
  const ry = useTransform(sx, [-0.5, 0.5], [-7, 7])
  const move = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const leave = () => {
    px.set(0)
    py.set(0)
  }
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </motion.div>
  )
}

export default function Services() {
  return (
    <section className="services section" id="services">
      <div className="wrap">
        <div className="section-head split">
          <div>
            <Reveal as="p" className="eyebrow">
              <span className="eyebrow-dot" /> How we help
            </Reveal>
            <SplitWords className="h2" text="Care for the *whole* you." />
          </div>
          <Reveal as="p" className="section-lede" delay={0.1}>
            Remedies for the body, a listening ear for the mind, and the option to do it all from
            home.
          </Reveal>
        </div>
        <div className="service-grid">
          {services.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1} className="service">
              <TiltCard className="service-card spot">
                <div className="service-top">
                  <span className="num">{s.n}</span>
                  <svg viewBox="0 0 80 80" className="service-art" aria-hidden="true">
                    {art[i]}
                  </svg>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <ul>
                  {s.points.map((p) => (
                    <li key={p}>
                      <Icon name="leaf" size={14} /> {p}
                    </li>
                  ))}
                </ul>
                <a href="#visit" className="service-link">
                  Book this <Icon name="arrow" size={16} />
                </a>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
