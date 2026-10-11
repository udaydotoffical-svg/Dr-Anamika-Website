import { motion } from 'motion/react'
import { principles } from '../content.js'
import { Reveal, SplitWords } from './ui.jsx'

const glyphs = [
  // a person: many parts, one whole
  <g key="0">
    <circle cx="40" cy="40" r="26" />
    <circle cx="40" cy="40" r="15" />
    <circle cx="40" cy="40" r="4" fill="currentColor" />
  </g>,
  // a single globule
  <g key="1">
    <circle cx="40" cy="40" r="26" strokeDasharray="2 5" />
    <circle cx="40" cy="40" r="10" fill="currentColor" />
  </g>,
  // diminishing dose
  <g key="2">
    <circle cx="20" cy="40" r="11" />
    <circle cx="44" cy="40" r="7" />
    <circle cx="60" cy="40" r="4" />
    <circle cx="71" cy="40" r="2" fill="currentColor" />
  </g>,
]

export default function Principles() {
  return (
    <section className="principles section" id="approach">
      <div className="wrap">
        <div className="section-head">
          <Reveal as="p" className="eyebrow">
            <span className="eyebrow-dot" /> Our approach
          </Reveal>
          <SplitWords className="h2" text="Classical homeopathy. / *No shortcuts.*" />
          <Reveal as="p" className="section-lede" delay={0.1}>
            Avighna follows Hahnemann’s original method. It takes more time and more care, and it
            treats the person in front of us, not a list of symptoms.
          </Reveal>
        </div>
        <div className="principle-grid">
          {principles.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.12} className="principle">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="principle-inner spot">
                <div className="principle-top">
                  <span className="num">{p.n}</span>
                  <svg viewBox="0 0 80 80" className="principle-glyph" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                    {glyphs[i]}
                  </svg>
                </div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
