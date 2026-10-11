// Rough device buckets so phones get a lighter scene: 0 = low, 1 = mid, 2 = high.
export function gpuTier() {
  if (typeof navigator === 'undefined') return 1
  const mem = navigator.deviceMemory || 8
  const cores = navigator.hardwareConcurrency || 8
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  if (mem <= 2 || cores <= 2) return 0
  if (coarse || mem <= 4 || cores <= 4) return 1
  return 2
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl')
  } catch {
    return false
  }
}
