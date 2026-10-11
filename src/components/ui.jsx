import { Fragment } from 'react'
import { motion } from 'motion/react'
import { clinic, links } from '../content.js'

const EASE = [0.22, 1, 0.36, 1]

export function Reveal({ as = 'div', delay = 0, y = 28, className, children, ...rest }) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </M>
  )
}

// Headline that rises word by word. Wrap words in *asterisks* to set them in italic.
export function SplitWords({ text, as = 'h2', className, delay = 0, immediate = false }) {
  const Tag = motion[as]
  let em = false
  const words = text.split(' ').map((w) => {
    const start = w.startsWith('*')
    const end = /\*[.,!?]?$/.test(w)
    if (start) em = true
    const word = { w: w.replace(/\*/g, ''), em }
    if (end) em = false
    return word
  })
  const anim = immediate ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } }
  return (
    <Tag className={className} initial="hide" {...anim} aria-label={text.replace(/\*/g, '').replace(/ \/ /g, ' ')}>
      {words.map((x, i) =>
        x.w === '/' ? (
          <br key={i} />
        ) : (
          <Fragment key={i}>
            <span className="word" aria-hidden="true">
              <motion.span
                className={x.em ? 'em' : undefined}
                variants={{ hide: { y: '108%', rotate: 4 }, show: { y: '0%', rotate: 0 } }}
                transition={{ duration: 1.05, ease: EASE, delay: delay + i * 0.055 }}
              >
                {x.w}
              </motion.span>
            </span>{' '}
          </Fragment>
        ),
      )}
    </Tag>
  )
}

export { default as Logo } from './Logo.jsx'

export function Stars({ value = 5, size = 16 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.6l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.8l-5.3 3 1.2-5.9L1.4 7.8l6-.7z" fill={i < Math.round(value) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  )
}

const paths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  pin: 'M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21zM12 12.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z',
  phone: 'M5 4h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 5.9 5.9l1.4-2.3L19 15.5V19a1.6 1.6 0 0 1-1.7 1.6C10.2 20.1 3.9 13.8 3.4 5.7A1.6 1.6 0 0 1 5 4z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.2 2',
  chat: 'M4 19.5l1.3-3.9A8 8 0 1 1 8.6 19L4 19.5z',
  video: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h9a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 14 18H5a1.5 1.5 0 0 1-1.5-1.5zM15.5 10.5l5-3v9l-5-3',
  plus: 'M12 5v14M5 12h14',
  leaf: 'M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l9-9',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  menu: 'M4 8h16M4 16h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  external: 'M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4',
}

export function Icon({ name, size = 18, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

// Where "Call" and "WhatsApp" go. Without a number on file they open the Google listing,
// which always carries the clinic's current phone number.
export function contactHref(kind, text = '') {
  if (kind === 'whatsapp' && clinic.whatsapp)
    return `https://wa.me/${clinic.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
  if (kind === 'call' && clinic.phone) return `tel:+${clinic.phone}`
  return links.maps
}

export function prettyPhone(p) {
  if (!p) return ''
  const local = p.replace(/^91/, '')
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
}
