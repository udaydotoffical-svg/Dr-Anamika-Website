import { useCallback, useEffect, useState } from 'react'
import Lenis from 'lenis'
import Loader from './components/Loader.jsx'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Principles from './components/Principles.jsx'
import Story from './components/Story.jsx'
import Care, { Marquee } from './components/Care.jsx'
import Doctor from './components/Doctor.jsx'
import Hours from './components/Hours.jsx'
import Reviews from './components/Reviews.jsx'
import Faq from './components/Faq.jsx'
import Visit from './components/Visit.jsx'
import Footer, { MobileBar } from './components/Footer.jsx'
import { prefersReducedMotion } from './lib/device.js'
import { setLenis } from './lib/scroll.js'

function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const lenis = new Lenis({ autoRaf: true, anchors: { duration: 1.4 }, lerp: 0.1 })
    setLenis(lenis)
    return () => {
      setLenis(null)
      lenis.destroy()
    }
  }, [])
}

// Buttons marked .magnetic lean toward the cursor a little.
function useMagnetic() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return
    const els = [...document.querySelectorAll('.magnetic')]
    const move = (e) => {
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left - r.width / 2) * 0.25
      const y = (e.clientY - r.top - r.height / 2) * 0.35
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    const leave = (e) => (e.currentTarget.style.transform = '')
    els.forEach((el) => {
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', leave)
    })
    return () =>
      els.forEach((el) => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', leave)
      })
  }, [])
}

function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const move = (e) => {
      const el = e.target.closest?.('.spot')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', move, { passive: true })
    return () => document.removeEventListener('pointermove', move)
  }, [])
}

export default function App() {
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setTimeout(() => setReady(true), 250), [])
  useSmoothScroll()
  useMagnetic()
  useSpotlight()

  return (
    <>
      <Loader ready={ready} />
      <a className="skip" href="#approach">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero onSceneReady={onReady} />
        <Marquee />
        <Principles />
        <Story />
        <Care />
        <Doctor />
        <Hours />
        <Reviews />
        <Faq />
        <Visit />
      </main>
      <Footer />
      <MobileBar />
    </>
  )
}
