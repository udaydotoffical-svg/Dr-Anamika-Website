import { hours, onlineHours } from '../content.js'
import { fmt, fmtRange } from '../lib/time.js'
import { useClinicStatus } from '../lib/hooks.js'
import { Reveal, SplitWords, Icon } from './ui.jsx'
import { motion } from 'motion/react'

const START = 9 * 60
const END = 21 * 60
const pct = (m) => `${((m - START) / (END - START)) * 100}%`
const ticks = [9, 12, 15, 18, 21]

export default function Hours() {
  const s = useClinicStatus()
  const { day, minutes } = s.now
  const showNow = minutes >= START && minutes <= END
  // Week starting today, so the first row is always the one that matters.
  const order = Array.from({ length: 7 }, (_, i) => (day + i) % 7)

  return (
    <section className="hours section" id="hours">
      <div className="wrap">
        <div className="section-head split">
          <div>
            <Reveal as="p" className="eyebrow">
              <span className="eyebrow-dot" /> Hours
            </Reveal>
            <SplitWords className="h2" text="Open *every day* of the week." />
          </div>
          <Reveal className={`live-card ${s.open ? 'is-open' : ''}`} delay={0.1}>
            <span className="live-dot" aria-hidden="true" />
            <div>
              <div className="live-label">{s.label}</div>
              <div className="live-sub">Clinic time (IST) · {fmt(minutes)} {hours[day].day}</div>
            </div>
          </Reveal>
        </div>

        <Reveal className="timeline spot" delay={0.1}>
          <div className="tl-head" aria-hidden="true">
            <span />
            <div className="tl-ticks">
              {ticks.map((h) => (
                <span key={h} style={{ left: pct(h * 60) }}>
                  {h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`}
                </span>
              ))}
            </div>
            <span />
          </div>
          <ul>
            {order.map((d, row) => {
              const h = hours[d]
              const today = row === 0
              return (
                <li key={h.day} className={`tl-row ${today ? 'is-today' : ''}`}>
                  <span className="tl-day">
                    {h.day}
                    {today && <em>Today</em>}
                  </span>
                  <div className="tl-track">
                    {ticks.map((t) => (
                      <i key={t} className="tl-grid" style={{ left: pct(t * 60) }} />
                    ))}
                    {h.sessions.map(([a, b], i) => (
                      <motion.span
                        key={i}
                        className="tl-bar"
                        style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})` }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.15 + row * 0.06 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ))}
                    {today && showNow && (
                      <span className="tl-now" style={{ left: pct(minutes) }}>
                        <b>Now</b>
                      </span>
                    )}
                  </div>
                  <span className="tl-times">{h.sessions.map(fmtRange).join(' · ')}</span>
                </li>
              )
            })}
            <li className="tl-row is-online">
              <span className="tl-day">
                Online
                <em>Daily</em>
              </span>
              <div className="tl-track">
                {ticks.map((t) => (
                  <i key={t} className="tl-grid" style={{ left: pct(t * 60) }} />
                ))}
                <span className="tl-bar online" style={{ left: pct(onlineHours[0]), width: `calc(${pct(onlineHours[1])} - ${pct(onlineHours[0])})` }} />
              </div>
              <span className="tl-times">{fmtRange(onlineHours)}</span>
            </li>
          </ul>
        </Reveal>

        <div className="hours-cards">
          <Reveal className="mini-card" delay={0}>
            <Icon name="clock" size={22} />
            <div>
              <h3>In the clinic</h3>
              <p>Morning 10 am – 2 pm and evening 5:30 – 8 pm. Sunday evenings run until 8:30 pm.</p>
            </div>
          </Reveal>
          <Reveal className="mini-card" delay={0.08}>
            <Icon name="video" size={22} />
            <div>
              <h3>Online consultations</h3>
              <p>9 am – 1 pm. Good for follow-ups, or if you live outside Vadodara.</p>
            </div>
          </Reveal>
          <Reveal className="mini-card" delay={0.16}>
            <Icon name="calendar" size={22} />
            <div>
              <h3>Book ahead</h3>
              <p>First consultations take longer, so a quick message before you come helps us keep time for you.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
