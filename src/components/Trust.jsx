import { clinic } from '../content.js'
import { Icon, Reveal } from './ui.jsx'

// Credentials at a glance, right under the hero.
export default function Trust() {
  const items = [
    { icon: 'check', top: clinic.qualifications, sub: `Reg. No. ${clinic.regNo}` },
    { icon: 'star', top: `${clinic.rating.toFixed(1)} on Google`, sub: `${clinic.reviewCount} patient reviews` },
    { icon: 'leaf', top: 'Classical homeopathy', sub: 'Plus counselling & therapy' },
    { icon: 'clock', top: 'Open 7 days', sub: 'In clinic & online' },
  ]
  return (
    <section className="trust" id="trust" aria-label="Credentials">
      <div className="wrap">
        <Reveal className="trust-row">
          {items.map((x) => (
            <div className="trust-item" key={x.top}>
              <span className="trust-icon"><Icon name={x.icon} size={18} /></span>
              <span>
                <b>{x.top}</b>
                <small>{x.sub}</small>
              </span>
            </div>
          ))}
        </Reveal>
        <p className="trust-tag">“{clinic.tagline}.”</p>
      </div>
    </section>
  )
}
