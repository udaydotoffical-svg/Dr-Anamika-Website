import { motion } from 'motion/react'
import { care, conditions } from '../content.js'
import { Reveal, SplitWords, Icon } from './ui.jsx'

export function Marquee() {
  const row = [...conditions, ...conditions]
  return (
    <div className="marquee" aria-label={`Commonly consulted for: ${conditions.join(', ')}`}>
      <div className="marquee-track" aria-hidden="true">
        {row.map((c, i) => (
          <span key={i} className="marquee-item">
            {c}
            <i className="globule" />
          </span>
        ))}
      </div>
    </div>
  )
}

const shapes = {
  sky: <path d="M10 70C10 35 35 10 70 10C70 45 45 70 10 70Z" />,
  card: <circle cx="40" cy="40" r="28" />,
  cream: <path d="M40 8C52 28 64 40 64 52a24 24 0 0 1-48 0C16 40 28 28 40 8Z" />,
  deep: (
    <g>
      <circle cx="26" cy="40" r="14" />
      <circle cx="54" cy="40" r="14" />
    </g>
  ),
}

export default function Care() {
  return (
    <section className="care section" id="care">
      <div className="wrap">
        <div className="section-head split">
          <div>
            <Reveal as="p" className="eyebrow">
              <span className="eyebrow-dot" /> Care
            </Reveal>
            <SplitWords className="h2" text="What people *come to us for.*" />
          </div>
          <Reveal as="p" className="section-lede" delay={0.1}>
            Short-lived complaints and long-standing ones, in adults and children. Not sure whether
            homeopathy fits your case? Ask. You will get an honest answer.
          </Reveal>
        </div>
        <div className="bento">
          {care.map((c, i) => (
            <Reveal key={c.title} delay={(i % 4) * 0.08} className={`tile tone-${c.tone} ${c.size ? `is-${c.size}` : ''}`}>
              <motion.a href="#visit" className="tile-inner spot" whileHover="hover" initial="rest">
                <motion.svg
                  viewBox="0 0 80 80"
                  className="tile-shape"
                  aria-hidden="true"
                  variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: 25, scale: 1.12 } }}
                  transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                >
                  {shapes[c.tone]}
                </motion.svg>
                <span className="tile-idx">{String(i + 1).padStart(2, '0')}</span>
                <div className="tile-body">
                  <h3>{c.title}</h3>
                  <p>{c.detail}</p>
                </div>
                <motion.span className="tile-go" variants={{ rest: { x: -6, opacity: 0 }, hover: { x: 0, opacity: 1 } }}>
                  <Icon name="arrow" size={18} />
                </motion.span>
              </motion.a>
            </Reveal>
          ))}
        </div>
        <Reveal as="p" className="fine-print">
          Homeopathy works alongside, not instead of, the care of your other doctors. Please do not
          stop any prescribed medicine on your own.
        </Reveal>
      </div>
    </section>
  )
}
