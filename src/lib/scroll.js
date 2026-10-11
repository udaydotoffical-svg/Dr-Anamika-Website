// One shared Lenis instance so in-page jumps glide the same way as wheel scrolling.
let lenis = null

export function setLenis(l) {
  lenis = l
}

export function scrollToY(y) {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

