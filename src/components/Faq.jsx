import { useState } from 'react'
import { faqs } from '../content.js'
import { Icon, Reveal, SplitWords } from './ui.jsx'

export default function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="faq section" id="faq">
      <div className="wrap faq-grid">
        <div className="faq-side">
          <Reveal as="p" className="eyebrow">
            <span className="eyebrow-dot" /> Questions
          </Reveal>
          <SplitWords className="h2" text="Good questions, *plain answers.*" />
          <Reveal as="p" className="section-lede" delay={0.1}>
            Anything else on your mind? Ask during your visit. There is no such thing as a small
            symptom in classical homeopathy.
          </Reveal>
        </div>
        <Reveal className="accordion">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q} className={`acc-item ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-q-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{f.q}</span>
                    <span className="acc-icon">
                      <Icon name="plus" size={18} />
                    </span>
                  </button>
                </h3>
                <div className="acc-panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                  <div>
                    <p>{f.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
