// Procedural models: everything is built from code, so there are no model files to download.
import * as THREE from 'three'

// Smooth a polyline profile (x = radius, y = height) with a Catmull-Rom curve,
// keeping hard corners where `sharp` is set on a point.
function smoothProfile(pts, samples = 6) {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const n = p1.sharp || p2.sharp ? 1 : samples
    for (let s = 0; s < n; s++) {
      const t = s / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push(new THREE.Vector2(Math.max(0, f(p0.x, p1.x, p2.x, p3.x)), f(p0.y, p1.y, p2.y, p3.y)))
    }
  }
  const last = pts[pts.length - 1]
  out.push(new THREE.Vector2(last.x, last.y))
  return out
}

const P = (x, y, sharp) => ({ x, y, sharp })

// Classic homeopathy vial: tall clear glass tube, short shoulder, threaded neck with a lip.
// Closed glass shell (outer wall up, inner wall back down) so refraction reads as real glass.
export function vialGeometry() {
  const t = 0.04
  const profile = [
    P(0, -1.4, true),
    P(0.44, -1.4),
    P(0.51, -1.36),
    P(0.52, -1.27),
    P(0.52, 0.92),
    P(0.5, 1.03),
    P(0.42, 1.11),
    P(0.4, 1.18),
    P(0.4, 1.31),
    P(0.44, 1.35),
    P(0.44, 1.42),
    P(0.41, 1.46, true),
    P(0.4 - t, 1.46, true),
    P(0.4 - t, 1.18),
    P(0.42 - t, 1.09),
    P(0.5 - t, 1.01),
    P(0.52 - t, 0.92),
    P(0.52 - t, -1.27),
    P(0.47 - t, -1.34),
    P(0.32, -1.4 + t),
    P(0, -1.4 + t, true),
  ]
  const g = new THREE.LatheGeometry(smoothProfile(profile), 80)
  g.computeVertexNormals()
  return g
}

// Screw cap with a knurled grip: alternate lathe segments are pushed in and out.
export function capGeometry() {
  const profile = [
    P(0, -0.24, true),
    P(0.4, -0.24, true),
    P(0.47, -0.22),
    P(0.48, -0.16),
    P(0.48, 0.14),
    P(0.46, 0.21),
    P(0.38, 0.25),
    P(0, 0.25, true),
  ]
  const pts = smoothProfile(profile, 4)
  const segs = 120
  const g = new THREE.LatheGeometry(pts, segs)
  const pos = g.attributes.position
  const n = pts.length
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / n)
    const y = pos.getY(i)
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r > 0.46 && y > -0.17 && y < 0.15) {
      const k = 1 + (seg % 2 ? 0.022 : -0.022)
      pos.setXYZ(i, x * k, y, z * k)
    }
  }
  g.computeVertexNormals()
  return g
}

// Hex-packed globules filling the vial from the bottom up.
export function packedGlobules(radius, innerR, yMin, yMax) {
  const out = []
  const layerH = radius * 1.75
  let layer = 0
  for (let y = yMin + radius; y < yMax; y += layerH, layer++) {
    const off = layer % 2 ? radius : 0
    for (let x = -innerR; x <= innerR; x += radius * 2.02) {
      for (let z = -innerR; z <= innerR; z += radius * 1.76) {
        const row = Math.round((z + innerR) / (radius * 1.76))
        const px = x + off + (row % 2 ? radius : 0) + (Math.random() - 0.5) * radius * 0.6
        const pz = z + (Math.random() - 0.5) * radius * 0.6
        if (Math.hypot(px, pz) < innerR - radius) {
          out.push([px, y + (Math.random() - 0.5) * radius * 0.8, pz])
        }
      }
    }
  }
  return out
}

// Paper label sized for a 2.3 rad wrap around the vial (canvas aspect ≈ arc / height).
export function labelTexture(fontFamily) {
  const W = 890
  const H = 700
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  const ls = (v) => 'letterSpacing' in ctx && (ctx.letterSpacing = v)
  ctx.fillStyle = '#fffaf0'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#086288'
  ctx.fillRect(0, 70, W, 170)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffefc4'
  ctx.font = `600 104px ${fontFamily}`
  ls('16px')
  ctx.fillText('AVIGHNA', W / 2 + 8, 192)
  ctx.fillStyle = '#086288'
  ctx.font = `600 34px ${fontFamily}`
  ls('9px')
  ctx.fillText('CLASSICAL HOMEOPATHY', W / 2 + 4, 318)
  ctx.fillStyle = '#97d7ff'
  ctx.fillRect(W / 2 - 90, 362, 180, 5)
  ctx.fillStyle = '#086288'
  ctx.font = `italic 400 58px ${fontFamily}`
  ls('0px')
  ctx.fillText('Dr. Anamika', W / 2, 462)
  ctx.fillStyle = '#4d8dba'
  ctx.font = `500 30px ${fontFamily}`
  ls('6px')
  ctx.fillText('TARSALI · VADODARA', W / 2 + 3, 530)
  ctx.fillStyle = '#4d8dba'
  ctx.fillRect(0, H - 70, W, 8)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function radialTexture(inner, outer = 'rgba(0,0,0,0)') {
  const s = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
