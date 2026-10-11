import { MARK } from '../lib/logo.js'

// The clinic emblem. `ring` adds the round badge; colours come from CSS variables so it works
// on light and dark backgrounds (set --logo-ink / --logo-accent on a parent).
export default function Logo({ ring = false, className = '' }) {
  return (
    <svg className={`logo-mark ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      {ring && (
        <>
          <circle cx="32" cy="32" r="30.5" fill="var(--logo-bg, transparent)" stroke="var(--logo-ink, currentColor)" strokeWidth="1.2" />
          <circle cx="32" cy="32" r="27.2" fill="none" stroke="var(--logo-accent, var(--sky))" strokeWidth="0.7" strokeDasharray="1.2 2.4" />
        </>
      )}
      <g transform={ring ? 'translate(32 32) scale(.74) translate(-32 -33)' : undefined}>
        <path d={MARK.wings} fill="var(--logo-ink, currentColor)" />
        <path d={MARK.wings} fill="var(--logo-ink, currentColor)" transform="translate(64 0) scale(-1 1)" />
        <circle cx={MARK.finial.cx} cy={MARK.finial.cy} r={MARK.finial.r} fill="var(--logo-ink, currentColor)" />
        <path d={MARK.staff} stroke="var(--logo-ink, currentColor)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d={MARK.tube} stroke="var(--logo-ink, currentColor)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d={MARK.stem} stroke="var(--logo-ink, currentColor)" strokeWidth="2.6" strokeLinecap="round" />
        {MARK.ears.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="2.5" fill="var(--logo-accent, var(--sky))" stroke="var(--logo-ink, currentColor)" strokeWidth="1.4" />
        ))}
        <circle cx={MARK.chest.cx} cy={MARK.chest.cy} r={MARK.chest.r} fill="var(--logo-accent, var(--sky))" stroke="var(--logo-ink, currentColor)" strokeWidth="2" />
        <circle cx="32" cy="36" r="1.8" fill="var(--logo-ink, currentColor)" />
      </g>
    </svg>
  )
}
