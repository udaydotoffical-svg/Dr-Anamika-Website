import { motion } from 'motion/react'
import { clinic, links, testimonials } from '../content.js'
import { Icon, Reveal, Stars } from './ui.jsx'

export default function Reviews() {
  return (
    <section className="reviews section-sm" id="reviews">
      <div className="wrap">
        <Reveal className="rating-card">
          <div className="rating-orbit" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ '--i': i }} />
            ))}
          </div>
          <div className="rating-num">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {clinic.rating.toFixed(1)}
            </motion.span>
          </div>
          <div className="rating-copy">
            <Stars value={clinic.rating} size={22} />
            <h2 className="h3">
              Rated {clinic.rating.toFixed(1)} out of 5 by {clinic.reviewCount} patients on Google.
            </h2>
            <p>Read what patients say about their visits, or add your own after your consultation.</p>
            <div className="cta-row">
              <a className="btn btn-light" href={links.reviews} target="_blank" rel="noreferrer">
                Read the reviews <Icon name="external" size={16} />
              </a>
              <a className="btn btn-outline-light" href={links.reviews} target="_blank" rel="noreferrer">
                Write a review
              </a>
            </div>
          </div>
        </Reveal>

        {testimonials.length > 0 && (
          <div className="quotes">
            {testimonials.map((t, i) => (
              <Reveal key={i} as="figure" className="quote-card" delay={i * 0.08}>
                <Stars value={5} size={13} />
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  {t.name}
                  {t.when ? <span> · {t.when}</span> : null}
                </figcaption>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
