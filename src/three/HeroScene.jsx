// Hero: an open homeopathy vial full of white globules. The cap floats off the neck and
// a slow stream of pills drifts out of the mouth. Everything is built in code (models.js).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { capGeometry, labelTexture, packedGlobules, radialTexture, vialGeometry } from './models.js'
import { gpuTier, prefersReducedMotion } from '../lib/device.js'

const BG = '#fff5dc'
const DEEP = '#086288'
const PILL = '#ffffff'
const TILT = -0.32
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const damp = THREE.MathUtils.damp

function useHeroScroll() {
  const ref = useRef(0)
  useEffect(() => {
    const on = () => (ref.current = Math.min(1.5, window.scrollY / window.innerHeight))
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return ref
}

function Label() {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let alive = true
    const fam = '"Fraunces Variable", Georgia, serif'
    const draw = () => alive && setTex(labelTexture(fam))
    if (document.fonts?.load) {
      Promise.all([document.fonts.load(`600 104px ${fam}`), document.fonts.load(`italic 400 58px ${fam}`)]).then(draw, draw)
    } else draw()
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => () => tex?.dispose(), [tex])
  if (!tex) return null
  return (
    <mesh position={[0, -0.3, 0]}>
      <cylinderGeometry args={[0.527, 0.527, 0.95, 64, 1, true, -1.15, 2.3]} />
      <meshStandardMaterial map={tex} roughness={0.7} />
    </mesh>
  )
}

// White globules packed inside the vial, in the vial's own frame.
function Fill() {
  const pills = useMemo(() => packedGlobules(0.062, 0.48, -1.36, 0.62), [])
  const ref = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    pills.forEach((p, i) => ref.current.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2])))
    ref.current.instanceMatrix.needsUpdate = true
  }, [pills])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pills.length]}>
      <sphereGeometry args={[0.062, 14, 10]} />
      <meshStandardMaterial color={PILL} roughness={0.42} />
    </instancedMesh>
  )
}

// Pills leaving the mouth of the vial and drifting up, like they weigh nothing.
function Stream({ count, intro, reduced }) {
  const ref = useRef()
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        o: i / count + Math.random() * 0.03,
        a: Math.random() * Math.PI * 2,
        l: 0.25 + Math.random() * 0.75,
        s: 0.8 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2,
      })),
    [count],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    const k = smooth(0.55, 1, intro.current)
    seeds.forEach((d, i) => {
      const u = (d.o + t * 0.055) % 1
      const lat = d.l * (0.1 + u * 0.95)
      v.set(
        Math.cos(d.a) * lat + u * u * 0.55 + Math.sin(t * 0.7 + d.ph) * 0.05 * u,
        1.42 + u * 2.5,
        Math.sin(d.a) * lat * 0.8,
      )
      sc.setScalar(d.s * k * smooth(0, 0.07, u) * (1 - smooth(0.72, 1, u)))
      m.compose(v, q, sc)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.07, 16, 12]} />
      <meshPhysicalMaterial color={PILL} roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.3} />
    </instancedMesh>
  )
}

function Vial({ tier, intro, reduced }) {
  const glass = useMemo(vialGeometry, [])
  return (
    <group>
      <mesh geometry={glass} renderOrder={2}>
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          roughness={0.03}
          thickness={0.3}
          ior={1.5}
          dispersion={0.3}
          clearcoat={1}
          clearcoatRoughness={0.04}
          attenuationColor="#e6f5ff"
          attenuationDistance={1.6}
          specularIntensity={1}
          envMapIntensity={1.4}
        />
      </mesh>
      <Fill />
      <Label />
      <Stream count={tier === 0 ? 14 : 28} intro={intro} reduced={reduced} />
    </group>
  )
}

function Cap() {
  const geo = useMemo(capGeometry, [])
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color={DEEP} roughness={0.34} clearcoat={0.7} clearcoatRoughness={0.2} envMapIntensity={0.55} />
    </mesh>
  )
}

// Loose pills orbiting the vial.
function Drift({ count, scroll, intro }) {
  const ref = useRef()
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        a: (i / count) * Math.PI * 2 * 2.3 + Math.random() * 0.6,
        r: 1.5 + Math.random() * 1.5,
        y: (Math.random() - 0.5) * 3.4,
        s: 0.55 + Math.random() * 0.8,
        sp: 0.04 + Math.random() * 0.1,
        ph: Math.random() * Math.PI * 2,
        from: new THREE.Vector3((Math.random() - 0.5) * 12, -6 - Math.random() * 4, (Math.random() - 0.5) * 6),
      })),
    [count],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const k = ease(intro.current)
    const spread = 1 + scroll.current * 0.9
    seeds.forEach((d, i) => {
      const a = d.a + t * d.sp
      v.set(Math.cos(a) * d.r * spread, d.y + Math.sin(t * 0.6 + d.ph) * 0.12 + scroll.current * d.y * 0.6, Math.sin(a) * d.r * 0.7)
      v.lerpVectors(d.from, v, k)
      sc.setScalar(d.s * k)
      m.compose(v, q, sc)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.07, 16, 12]} />
      <meshPhysicalMaterial color={PILL} roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.3} />
    </instancedMesh>
  )
}

function Composition({ tier, reduced }) {
  const group = useRef()
  const vial = useRef()
  const cap = useRef()
  const shadow = useRef()
  const scroll = useHeroScroll()
  const intro = useRef(reduced ? 1 : 0)
  const { viewport, size } = useThree()
  // Opaque on purpose (edges are exactly the background colour) so the glass refracts it.
  const glow = useMemo(() => radialTexture('rgb(184,224,244)', BG), [])
  const shade = useMemo(() => radialTexture('rgba(8,66,92,0.38)', 'rgba(8,66,92,0)'), [])

  // Right of the headline on wide screens, centred in its own block on phones.
  const wide = size.width / size.height > 1.05
  const layout = wide
    ? { x: Math.min(viewport.width * 0.24, 3.6), y: -0.3, s: Math.min(1.05, viewport.height / 6) }
    : { x: 0, y: -0.4, s: Math.min(0.84, viewport.width / 4.7) }

  useFrame((state, dt) => {
    intro.current = Math.min(1, intro.current + dt / 2.4)
    const k = ease(intro.current)
    const p = scroll.current
    const t = state.clock.elapsedTime
    const g = group.current
    const px = reduced ? 0 : state.pointer.x
    const py = reduced ? 0 : state.pointer.y
    g.rotation.y = damp(g.rotation.y, px * 0.3 + p * 0.8, 3, dt)
    g.rotation.x = damp(g.rotation.x, -py * 0.12 + p * 0.12, 3, dt)
    g.position.y = layout.y + p * 2 + (1 - k) * -1.4

    const v = vial.current
    v.rotation.z = THREE.MathUtils.lerp(-0.85, TILT, k) - p * 0.25
    // sway rather than spin, so the label keeps facing the visitor
    v.rotation.y = reduced ? 0 : Math.sin(t * 0.35) * 0.55

    const c = cap.current
    c.position.set(-0.62, 2.05 + (1 - k) * 2.5 + p * 0.6, 0.35)
    c.rotation.set(0.55 + Math.sin(t * 0.5) * 0.08, reduced ? 0 : t * 0.25, 0.5 - (1 - k) * 1.2)

    shadow.current.material.opacity = k * Math.max(0, 1 - p * 1.6)
  })

  return (
    <group position={[layout.x, 0, 0]} scale={layout.s}>
      <mesh position={[0.1, 0.35, -2.4]} scale={wide ? 7.8 : 6.6}>
        <planeGeometry />
        <meshBasicMaterial map={glow} toneMapped={false} />
      </mesh>
      <group ref={group}>
        <Float speed={reduced ? 0 : 1.2} rotationIntensity={0.15} floatIntensity={0.3}>
          <group ref={vial}>
            <Vial tier={tier} intro={intro} reduced={reduced} />
          </group>
          <group ref={cap}>
            <Cap />
          </group>
        </Float>
        <Drift count={tier === 0 ? 24 : tier === 1 ? 40 : 60} scroll={scroll} intro={intro} />
      </group>
      <mesh ref={shadow} position={[0.05, -1.85, 0]} rotation-x={-Math.PI / 2} scale={[3.6, 1.2, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={shade} transparent depthWrite={false} toneMapped={false} opacity={0} />
      </mesh>
    </group>
  )
}

export default function HeroScene({ onReady, active = true }) {
  const tier = useMemo(gpuTier, [])
  const reduced = useMemo(prefersReducedMotion, [])
  const [dpr, setDpr] = useState(tier === 2 ? 1.75 : tier === 1 ? 1.4 : 1)

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 9], fov: 32, near: 0.1, far: 60 }}
      gl={{ antialias: tier > 0, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        onReady?.()
      }}
    >
      <color attach="background" args={[BG]} />
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.35))} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#fffaf0" />
      <directionalLight position={[-5, 2, -3]} intensity={1} color="#97d7ff" />
      <Environment resolution={tier === 2 ? 256 : 128} frames={1}>
        <color attach="background" args={['#dfe8ee']} />
        <Lightformer form="rect" intensity={3} position={[0, 5, -2]} scale={[10, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2.4} position={[-5, 1, 1]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} color="#97d7ff" />
        <Lightformer form="rect" intensity={1.8} position={[5, 0, 2]} scale={[2, 8, 1]} rotation-y={-Math.PI / 2} color="#fff1cc" />
        <Lightformer form="ring" intensity={2} position={[2, 3, 6]} scale={2.5} />
      </Environment>
      <Composition tier={tier} reduced={reduced} />
    </Canvas>
  )
}
