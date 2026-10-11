// "From many symptoms to one remedy": globules re-form for each step of the visit.
//   0 scattered cloud (listening) · 1 sphere (the whole picture)
//   2 one remedy (everything collapses into one globule) · 3 orbit (follow-ups)
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { gpuTier, prefersReducedMotion } from '../lib/device.js'
import { radialTexture } from './models.js'

const BG = '#05405a'

function formations(n) {
  const cloud = []
  const sphere = []
  const center = []
  const ring = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    // cloud: loose clusters, like symptoms that don't seem connected yet
    const cl = i % 7
    const ca = (cl / 7) * Math.PI * 2
    const cx = Math.cos(ca) * 1.7
    const cy = Math.sin(ca * 1.3) * 1.25
    const r = Math.pow(Math.random(), 0.6) * 0.9
    const a1 = Math.random() * Math.PI * 2
    const a2 = Math.acos(2 * Math.random() - 1)
    cloud.push(new THREE.Vector3(cx + r * Math.sin(a2) * Math.cos(a1), cy + r * Math.cos(a2), r * Math.sin(a2) * Math.sin(a1) - 0.5))
    // sphere: fibonacci lattice
    const y = 1 - (i / (n - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const th = golden * i
    sphere.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(1.55))
    // center: everything inside the remedy
    center.push(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2))
    // ring: an orbit around the remedy
    const ra = (i / n) * Math.PI * 2
    const rr = 1.9 + (Math.random() - 0.5) * 0.35
    ring.push(new THREE.Vector3(Math.cos(ra) * rr, (Math.random() - 0.5) * 0.16, Math.sin(ra) * rr))
  }
  return [cloud, sphere, center, ring]
}

function Particles({ count, progress, reduced }) {
  const ref = useRef()
  const core = useRef()
  const halo = useRef()
  const ringGroup = useRef()
  const light = useRef()
  const forms = useMemo(() => formations(count), [count])
  const state = useMemo(
    () =>
      forms[0].map((p) => ({
        pos: p.clone().multiplyScalar(1.6),
        rate: 1.4 + Math.random() * 2.2,
        ph: Math.random() * Math.PI * 2,
        s: 0.7 + Math.random() * 0.6,
        scale: 1,
      })),
    [forms],
  )
  const haloTex = useMemo(() => radialTexture('rgba(151,215,255,0.8)', 'rgba(5,64,90,0)'), [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const tgt = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  const { size, viewport } = useThree()
  const narrow = size.width / size.height < 0.9
  const wideScale = Math.min(1, viewport.width / 9)

  useFrame((s, dt) => {
    dt = Math.min(dt, 0.05)
    const t = s.clock.elapsedTime
    const step = Math.min(3, Math.floor(progress.current * 4))
    const target = forms[step]
    for (let i = 0; i < count; i++) {
      const d = state[i]
      tgt.copy(target[i])
      if (step === 0 && !reduced) {
        tgt.x += Math.sin(t * 0.5 + d.ph) * 0.15
        tgt.y += Math.cos(t * 0.4 + d.ph) * 0.15
      }
      const k = 1 - Math.exp(-dt * d.rate)
      d.pos.lerp(tgt, k)
      const wantScale = step === 2 ? 0 : 1
      d.scale += (wantScale - d.scale) * (1 - Math.exp(-dt * d.rate * 1.2))
      sc.setScalar(d.s * d.scale)
      m.compose(d.pos, q, sc)
      ref.current.setMatrixAt(i, m)
    }
    ref.current.instanceMatrix.needsUpdate = true

    const spin = reduced ? 0 : dt
    ref.current.rotation.y += spin * (step === 3 ? 0.35 : 0.08)
    ringGroup.current.rotation.x = THREE.MathUtils.damp(ringGroup.current.rotation.x, step === 3 ? 0.42 : 0, 2, dt)

    const coreScale = step >= 2 ? (step === 2 ? 1 : 0.62) : 0.001
    const c = core.current.scale.x
    core.current.scale.setScalar(THREE.MathUtils.damp(c, coreScale, 3, dt))
    const pulse = reduced ? 1 : 1 + Math.sin(t * 2) * 0.04
    halo.current.scale.setScalar(core.current.scale.x * 3.4 * pulse)
    halo.current.material.opacity = Math.min(0.7, core.current.scale.x)
    light.current.intensity = core.current.scale.x * 18
  })

  return (
    <group position={narrow ? [0, 1.3, 0] : [-viewport.width * 0.25, 0, 0]} scale={narrow ? Math.min(0.78, viewport.width / 5.6) : wideScale}>
      <group ref={ringGroup}>
        <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} emissive="#d6efff" emissiveIntensity={0.08} />
        </instancedMesh>
      </group>
      <mesh ref={core} scale={0.001}>
        <sphereGeometry args={[0.55, 48, 32]} />
        <meshPhysicalMaterial color="#ffefc4" emissive="#97d7ff" emissiveIntensity={0.45} roughness={0.25} clearcoat={1} />
      </mesh>
      <sprite ref={halo} scale={0.001}>
        <spriteMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight ref={light} color="#97d7ff" intensity={0} distance={7} decay={1.5} />
    </group>
  )
}

export default function StoryScene({ progress, active = true }) {
  const tier = useMemo(gpuTier, [])
  const reduced = useMemo(prefersReducedMotion, [])
  const [count] = useState(tier === 2 ? 720 : tier === 1 ? 420 : 240)
  return (
    <Canvas
      dpr={tier === 2 ? 1.75 : tier === 1 ? 1.4 : 1}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 8.5], fov: 38 }}
      gl={{ antialias: tier > 0, alpha: false }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 7, 14]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color="#fffaf0" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.5} position={[0, 4, 2]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1} position={[-4, 0, 2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} color="#97d7ff" />
      </Environment>
      <Particles count={count} progress={progress} reduced={reduced} />
    </Canvas>
  )
}
