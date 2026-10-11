import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { clinic, hours, links, onlineHours } from '../content.js'
import { fmtRange } from '../lib/time.js'
import { Icon, Logo, contactHref } from './ui.jsx'
import { StatusPill } from './Nav.jsx'

export default function Footer() {
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['30%', '0%'])

  return (
    <footer className="footer" ref={ref}>
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-cta">
            <h2>
              Ready when <span className="em">you are.</span>
            </h2>
            <div className="cta-row">
              <a href="#visit" className="btn btn-light btn-lg">
                Book a visit <Icon name="arrow" />
              </a>
              <a href={links.directions} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-lg">
                Directions
              </a>
            </div>
          </div>
          <div className="footer-cols">
            <div>
              <h4>Clinic</h4>
              <address>
                {clinic.addressLines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
              <StatusPill className="on-dark" />
            </div>
            <div>
              <h4>Hours</h4>
              <ul className="footer-hours">
                <li>
                  <span>Mon – Sat</span>
                  {hours[1].sessions.map((r) => (
                    <span key={r[0]}>{fmtRange(r)}</span>
                  ))}
                </li>
                <li>
                  <span>Sunday</span>
                  {hours[0].sessions.map((r) => (
                    <span key={r[0]}>{fmtRange(r)}</span>
                  ))}
                </li>
                <li>
                  <span>Online</span>
                  <span>{fmtRange(onlineHours)}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4>Explore</h4>
              <ul className="footer-links">
                <li><a href="#approach">Approach</a></li>
                <li><a href="#process">Your first visit</a></li>
                <li><a href="#care">Care</a></li>
                <li><a href="#faq">Questions</a></li>
                <li><a href={links.maps} target="_blank" rel="noreferrer">Google listing</a></li>
                {clinic.phone && <li><a href={contactHref('call')}>Call</a></li>}
              </ul>
            </div>
          </div>
        </div>
        <p className="disclaimer">
          Information on this website is general and is not a substitute for a consultation. Homeopathy
          is not for emergencies: for urgent symptoms call <a href="tel:108">108</a> or go to the nearest
          hospital. Do not stop prescribed medicines without speaking to the doctor who prescribed them.
        </p>
      </div>
      <motion.div className="wordmark" style={{ y }} aria-hidden="true">
        <Logo />
        Avighna
      </motion.div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} {clinic.name}</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  )
}

export function MobileBar() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => {
      const nearEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 200
      setShow(window.scrollY > window.innerHeight * 0.7 && !nearEnd)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="mobile-bar"
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <a href={contactHref('call')} target={clinic.phone ? undefined : '_blank'} rel="noreferrer">
            <Icon name="phone" size={18} />
            Call
          </a>
          <a href={links.directions} target="_blank" rel="noreferrer">
            <Icon name="pin" size={18} />
            Directions
          </a>
          <a href="#visit" className="is-main">
            <Icon name="calendar" size={18} />
            Book
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
