import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { clinic, hahnemann } from '../content.js'
import { Icon, Logo, Reveal, SplitWords, Stars } from './ui.jsx'

function Portrait() {
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])
  const rot = useTransform(scrollYProgress, [0, 1], [-10, 10])

  return (
    <div className="portrait" ref={ref}>
      <div className="portrait-arch">
        {clinic.doctorPhoto ? (
          <motion.img src={clinic.doctorPhoto} alt={clinic.doctor} style={{ y, scale: 1.12 }} />
        ) : (
          <motion.div className="portrait-art" style={{ y }}>
            <div className="portrait-glow" />
            <motion.div className="portrait-emblem" style={{ rotate: rot }}>
              <Logo ring />
            </motion.div>
            <svg className="portrait-pills" viewBox="0 0 400 500" aria-hidden="true">
              {[[96, 392, 10], [128, 424, 7], [300, 410, 9], [330, 372, 6], [256, 444, 7], [84, 150, 6], [318, 120, 8]].map(([x, yy, r], i) => (
                <circle key={i} cx={x} cy={yy} r={r} fill="#fff" stroke="#086288" strokeOpacity=".14" />
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
            <SplitWords className="h2 doctor-name" text={clinic.doctorFull} />
            <Reveal as="p" className="doctor-role" delay={0.1}>
              {clinic.qualifications} · Classical homeopath · Counsellor
            </Reveal>
            <Reveal as="ul" className="creds" delay={0.12}>
              <li><Icon name="check" size={14} /> {clinic.qualifications} (Bachelor of Homeopathic Medicine and Surgery)</li>
              <li><Icon name="check" size={14} /> Registered practitioner · Reg. No. {clinic.regNo}</li>
              <li><Icon name="check" size={14} /> Counselling &amp; therapy</li>
            </Reveal>
            <Reveal as="p" className="doctor-text" delay={0.15}>
              {clinic.doctor} practises homeopathy the classical way: a long first conversation, one
              carefully chosen remedy, and steady follow-ups. She also offers counselling and therapy,
              because health is rarely only physical. Patients come to the clinic in Tarsali, or
              consult online from wherever they are.
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
