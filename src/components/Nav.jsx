import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon, Logo } from './ui.jsx'
import { useClinicStatus, useScrolled } from '../lib/hooks.js'

const items = [
  ['Approach', '#approach'],
  ['Your visit', '#process'],
  ['Care', '#care'],
  ['Doctor', '#doctor'],
  ['Hours', '#hours'],
  ['Contact', '#visit'],
]

export function StatusPill({ className = '' }) {
  const s = useClinicStatus()
  return (
    <a href="#hours" className={`status-pill ${s.open ? (s.soon ? 'is-soon' : 'is-open') : 'is-closed'} ${className}`}>
      <span className="dot" aria-hidden="true" />
      {s.label}
    </a>
  )
}

export default function Nav() {
  const scrolled = useScrolled(30)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
        <a href="#top" className="brand" aria-label="Avighna Classical Homeopathy, home">
          <Logo />
          <span className="brand-text">
            <span className="brand-name">Avighna</span>
            <span className="brand-sub">Classical Homeopathy</span>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main">
          {items.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-right">
          <StatusPill className="hide-sm" />
          <a href="#visit" className="btn btn-dark btn-sm hide-sm">
            Book a visit
          </a>
          <button className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            className="sheet"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Mobile">
              {items.map(([label, href], i) => (
                <motion.a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="idx">0{i + 1}</span>
                  {label}
                </motion.a>
              ))}
            </nav>
            <div className="sheet-foot">
              <StatusPill />
              <a href="#visit" className="btn btn-dark" onClick={() => setOpen(false)}>
                Book a visit <Icon name="arrow" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
