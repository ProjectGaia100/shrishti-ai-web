import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// GLOBE CONFIGURATION — Edit these values to tweak the globe
// ============================================================

// --- Texture URLs ---
const EARTH_MAP = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const CLOUDS_MAP = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png';

// --- Globe Size & Detail ---
const GLOBE_RADIUS = 1;             // base sphere radius
const GLOBE_SEGMENTS = 64;          // sphere detail (higher = smoother mesh)
const CLOUDS_RADIUS = 1.015;        // cloud shell radius (slightly above earth)
const ATMOSPHERE_SCALE = 1.15;      // atmospheric glow shell scale

// --- Earth Material ---
const BUMP_SCALE = 0.06;            // terrain bump intensity
const METALNESS = 0.0;              // 0 = non-metallic (no shiny reflections)
const ROUGHNESS = 1.0;              // 1.0 = fully rough (no specular highlights at all)
const EMISSIVE_COLOR = 0x335577;    // self-illumination tint color
const EMISSIVE_INTENSITY = 0.55;    // how much the earth glows on its own (makes dark side visible)

// --- Clouds ---
const CLOUDS_OPACITY = 0.3;         // cloud layer transparency

// --- Starting Orientation (radians) ---
const INITIAL_ROTATION_X = 0.2;     // vertical tilt (positive = tilts top toward you, negative = away)
const INITIAL_ROTATION_Y = 3.4;    // horizontal facing (0 = Pacific, -1.0 ≈ Africa/Europe, -2.0 ≈ Americas)

// --- Rotation Speeds ---
const EARTH_ROTATION_SPEED = 0.08;  // earth rotation (radians/sec)
const CLOUDS_ROTATION_SPEED = 0.1;  // clouds rotation (radians/sec)

// --- Lighting (uniform from all sides) ---
const AMBIENT_INTENSITY = 3.0;      // ambient light flooding the whole scene equally

// --- Atmosphere Glow Shader ---
const ATMO_GLOW_POWER = 4.0;        // edge glow falloff exponent (higher = thinner rim)
const ATMO_GLOW_STRENGTH = 0.65;    // glow coverage (higher = less glow)
const ATMO_COLOR_R = 0.3;           // atmosphere glow red
const ATMO_COLOR_G = 0.6;           // atmosphere glow green
const ATMO_COLOR_B = 1.0;           // atmosphere glow blue

// --- Camera ---
const CAMERA_DISTANCE = 2.8;        // how far the camera is from the globe
const CAMERA_FOV = 45;              // field of view in degrees

// --- Orbit Controls ---
const ENABLE_ZOOM = false;
const ENABLE_PAN = false;
const MIN_POLAR_ANGLE = Math.PI / 3;       // limit vertical rotation (top)
const MAX_POLAR_ANGLE = (2 * Math.PI) / 3; // limit vertical rotation (bottom)

// --- Container Size ---
const CONTAINER_SM = 340;           // small screen size (px)
const CONTAINER_MD = 440;           // medium+ screen size (px)

// ============================================================

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);

  const [earthMap, bumpMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    EARTH_MAP,
    EARTH_BUMP,
    CLOUDS_MAP,
  ]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (earthRef.current) {
      earthRef.current.rotation.x = INITIAL_ROTATION_X;
      earthRef.current.rotation.y = INITIAL_ROTATION_Y + elapsed * EARTH_ROTATION_SPEED;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.x = INITIAL_ROTATION_X;
      cloudsRef.current.rotation.y = INITIAL_ROTATION_Y + elapsed * CLOUDS_ROTATION_SPEED;
    }
  });

  const emissive = useMemo(() => new THREE.Color(EMISSIVE_COLOR), []);

  return (
    <group>
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[GLOBE_RADIUS, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
        <meshStandardMaterial
          map={earthMap}
          bumpMap={bumpMap}
          bumpScale={BUMP_SCALE}
          metalness={METALNESS}
          roughness={ROUGHNESS}
          emissiveMap={earthMap}
          emissive={emissive}
          emissiveIntensity={EMISSIVE_INTENSITY}
        />
      </mesh>

      {/* Clouds layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[CLOUDS_RADIUS, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={CLOUDS_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric glow */}
      <AtmosphereGlow />
    </group>
  );
}

function AtmosphereGlow() {
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float glowPower;
        uniform float glowStrength;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(glowStrength - dot(vNormal, vec3(0.0, 0.0, 1.0)), glowPower);
          gl_FragColor = vec4(glowColor, 1.0) * intensity;
        }
      `,
      uniforms: {
        glowPower: { value: ATMO_GLOW_POWER },
        glowStrength: { value: ATMO_GLOW_STRENGTH },
        glowColor: { value: new THREE.Vector3(ATMO_COLOR_R, ATMO_COLOR_G, ATMO_COLOR_B) },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
  }, []);

  return (
    <mesh scale={[ATMOSPHERE_SCALE, ATMOSPHERE_SCALE, ATMOSPHERE_SCALE]}>
      <sphereGeometry args={[GLOBE_RADIUS, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}

function GlobeScene() {
  return (
    <>
      {/* Single strong ambient light — uniform brightness from all directions */}
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      <OrbitControls
        enableZoom={ENABLE_ZOOM}
        enablePan={ENABLE_PAN}
        autoRotate={false}
        minPolarAngle={MIN_POLAR_ANGLE}
        maxPolarAngle={MAX_POLAR_ANGLE}
      />
    </>
  );
}

export function AnimatedGlobe() {
  return (
    <div
      className="relative"
      style={{ overflow: 'visible', width: CONTAINER_MD, height: CONTAINER_MD }}
    >
      <Canvas
        camera={{ position: [0, 0, CAMERA_DISTANCE], fov: CAMERA_FOV }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', overflow: 'visible' }}
      >
        <GlobeScene />
      </Canvas>
      {/* Ambient glow behind globe */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-cyan-500/30 rounded-full" />
      </div>
    </div>
  );
}
