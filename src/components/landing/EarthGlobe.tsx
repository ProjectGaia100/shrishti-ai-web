import { useRef } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { useTexture, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

// Atmosphere glow shader
const AtmosphereMaterial = shaderMaterial(
  { color: new THREE.Color('#1a6fa8'), intensity: 0.5 },
  // vertex
  `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment
  `
    uniform vec3 color;
    uniform float intensity;
    varying vec3 vNormal;
    void main() {
      float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
      rim = pow(rim, 3.0);
      gl_FragColor = vec4(color, rim * intensity * 0.6);
    }
  `
)

extend({ AtmosphereMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereMaterial: React.PropsWithChildren<{
      color?: THREE.Color
      intensity?: number
      transparent?: boolean
      side?: THREE.Side
      depthWrite?: boolean
    }>
  }
}

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const drag = useRef({ active: false, lastX: 0, lastY: 0, velX: 0, velY: 0 })

  const [dayMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-day.jpg',
  ])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const d = drag.current
    if (d.active) {
      // dampen velocity while dragging
      d.velX *= 0.9
      d.velY *= 0.9
    } else {
      // auto-rotate + apply drag inertia
      groupRef.current.rotation.y += 0.001 + d.velX
      groupRef.current.rotation.x += d.velY
      // clamp x tilt
      groupRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, groupRef.current.rotation.x))
      d.velX *= 0.95
      d.velY *= 0.95
    }
  })

  const onPointerDown = (e: any) => {
    drag.current.active = true
    drag.current.lastX = e.clientX
    drag.current.lastY = e.clientY
    e.target.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: any) => {
    if (!drag.current.active) return
    const dx = (e.clientX - drag.current.lastX) * 0.005
    const dy = (e.clientY - drag.current.lastY) * 0.005
    drag.current.velX = dx
    drag.current.velY = dy
    if (groupRef.current) {
      groupRef.current.rotation.y += dx
      groupRef.current.rotation.x += dy
      groupRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, groupRef.current.rotation.x))
    }
    drag.current.lastX = e.clientX
    drag.current.lastY = e.clientY
  }

  const onPointerUp = () => { drag.current.active = false }

  return (
    <group ref={groupRef} rotation={[0.2, 0, 0.05]} position={[0, 0, 0]}>
      {/* Earth — grab cursor on hover */}
      <Sphere
        ref={earthRef}
        args={[1, 64, 64]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <meshPhongMaterial
          map={dayMap}
          specular={new THREE.Color('#0a1a2e')}
          shininess={6}
        />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere args={[1.08, 64, 64]}>
        {/* @ts-ignore */}
        <atmosphereMaterial
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </Sphere>
    </group>
  )
}

export function EarthScene() {
  return (
    <>
      <directionalLight position={[4, 2, 3]} intensity={5} color="#fff5e0" />
      <directionalLight position={[-1, 0, 2]} intensity={0.6} color="#4fc3f7" />
      <ambientLight intensity={0.35} />
      <Earth />
    </>
  )
}
