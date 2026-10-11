import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { clinic, hahnemann } from '../content.js'
import { Reveal, SplitWords, Stars } from './ui.jsx'

function Portrait() {
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])
  const rot = useTransform(scrollYProgress, [0, 1], [-8, 8])

  return (
    <div className="portrait" ref={ref}>
      <div className="portrait-arch">
        {clinic.doctorPhoto ? (
          <motion.img src={clinic.doctorPhoto} alt={clinic.doctor} style={{ y, scale: 1.12 }} />
        ) : (
          <motion.div className="portrait-art" style={{ y }}>
            <svg viewBox="0 0 400 500" aria-hidden="true">
              <defs>
                <radialGradient id="sun" cx="50%" cy="38%" r="55%">
                  <stop offset="0" stopColor="#97d7ff" stopOpacity=".55" />
                  <stop offset="1" stopColor="#97d7ff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="200" cy="190" r="190" fill="url(#sun)" />
              <motion.g style={{ rotate: rot, originX: '200px', originY: '420px' }}>
                <path d="M200 470C200 360 196 260 206 150" stroke="#086288" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M203 330C150 320 112 284 104 230C160 236 196 276 203 330Z" fill="#086288" />
                <path d="M201 280C252 262 286 220 288 166C234 178 202 222 201 280Z" fill="#4d8dba" />
                <path d="M204 210C168 190 150 150 156 110C192 128 210 166 204 210Z" fill="#97d7ff" />
                <path d="M206 158C232 136 240 104 232 76C206 92 196 124 206 158Z" fill="#d6efff" />
              </motion.g>
              {[[118, 400], [146, 426], [262, 412], [290, 386], [236, 440]].map(([x, yy], i) => (
                <circle key={i} cx={x} cy={yy} r={9 - i} fill="#fff" stroke="#086288" strokeOpacity=".12" />
              ))}
            </svg>
          </motion.div>
        )}
      </div>
      <div className="portrait-badge">
        <Stars value={clinic.rating} size={13} />
        <span>
          <b>{clinic.rating.toFixed(1)}</b> on Google
        </span>
      </div>
    </div>
  )
}

export default function Doctor() {
  return (
    <>
      <section className="doctor section" id="doctor">
        <div className="wrap doctor-grid">
          <Reveal>
            <Portrait />
          </Reveal>
          <div className="doctor-copy">
            <Reveal as="p" className="eyebrow">
              <span className="eyebrow-dot" /> Meet your homeopath
            </Reveal>
            <SplitWords className="h2 doctor-name" text={`${clinic.doctor}`} />
            <Reveal as="p" className="doctor-role" delay={0.1}>
              Classical homeopath · Founder, Avighna
              {clinic.qualifications ? ` · ${clinic.qualifications}` : ''}
            </Reveal>
            <Reveal as="p" className="doctor-text" delay={0.15}>
              {clinic.doctor} practises homeopathy the classical way: a long first conversation, one
              carefully chosen remedy, and steady follow-ups. Patients come to the clinic in Tarsali,
              or consult online from wherever they are.
            </Reveal>
            <Reveal as="p" className="doctor-text" delay={0.2}>
              The aim is simple. Understand the person, not just the complaint, and help their health
              move forward without obstacles.
            </Reveal>
            <Reveal className="doctor-stats" delay={0.25}>
              <div>
                <b>{clinic.rating.toFixed(1)}</b>
                <span>Google rating</span>
              </div>
              <div>
                <b>7</b>
                <span>days a week</span>
              </div>
              <div>
                <b>2</b>
                <span>ways to consult</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
      <section className="quote section-sm" aria-label="A quote from Samuel Hahnemann">
        <div className="wrap">
          <Reveal as="figure">
            <blockquote>
              <span className="qmark" aria-hidden="true">“</span>
              {hahnemann.quote}
            </blockquote>
            <figcaption>{hahnemann.source}</figcaption>
          </Reveal>
        </div>
      </section>
    </>
  )
}
