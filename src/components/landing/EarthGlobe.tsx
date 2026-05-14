import { useRef } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { useTexture, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

// Atmosphere glow shader
// Atmosphere glow shader — proper fresnel falloff
const AtmosphereMaterial = shaderMaterial(
  { color: new THREE.Color('#4fa8d8'), intensity: 0.6 },
  `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-worldPos.xyz);
      gl_Position = projectionMatrix * worldPos;
    }
  `,
  `
    uniform vec3 color;
    uniform float intensity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = dot(vNormal, vViewDir);
      fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
      fresnel = pow(fresnel, 6.0);
      gl_FragColor = vec4(color, fresnel * intensity);
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
  const cloudsRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const drag = useRef({ active: false, lastX: 0, lastY: 0, velX: 0, velY: 0 })

  const [dayMap, specularMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-day.jpg',
    'https://unpkg.com/three-globe/example/img/earth-water.png',
  ])

  const [cloudsMap] = useTexture(['/earth-clouds.png'])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const d = drag.current
    if (!d.active) {
      groupRef.current.rotation.y += 0.001 + d.velX
      groupRef.current.rotation.x += d.velY
      groupRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, groupRef.current.rotation.x))
      d.velX *= 0.95
      d.velY *= 0.95
    } else {
      d.velX *= 0.9
      d.velY *= 0.9
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = groupRef.current.rotation.y * 1.02 + clock.getElapsedTime() * 0.0003
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
    <group ref={groupRef} rotation={[0.2, 0, 0.05]}>
      {/* Earth surface */}
      <Sphere
        ref={earthRef}
        args={[1, 96, 96]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <meshPhongMaterial
          map={dayMap}
          specularMap={specularMap}
          specular={new THREE.Color('#2266aa')}
          shininess={12}
        />
      </Sphere>

      {/* Cloud layer */}
      {cloudsMap && (
        <Sphere ref={cloudsRef} args={[1.012, 96, 96]}>
          <meshPhongMaterial
            map={cloudsMap}
            transparent
            opacity={0.65}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>
      )}

    </group>
  )
}

export function EarthScene() {
  return (
    <>
      {/* Strong sun from upper-right — creates realistic day/night terminator */}
      <directionalLight position={[4, 2, 2]} intensity={3.5} color="#fff5e0" />
      {/* Very dim fill so night side shows faint city lights effect */}
      <ambientLight intensity={0.12} />
      <Earth />
    </>
  )
}
