import React, { useEffect, useRef } from 'react';

// --- FRAGMENT SHADER ---
// Smoke with flickering dots on far left/right edges only
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;
uniform vec3 u_glowColor;
uniform float u_glowIntensity;
uniform float u_brightness;
uniform float u_speed;
uniform float u_dotDensity;
uniform float u_dotBrightness;
uniform vec3 u_dotColor;
uniform float u_dotSize;
uniform float u_dotEdgeWidth;
uniform vec3 u_baseColor;
uniform float u_baseMix;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time * u_speed + 660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

// Simple tiny dot with flicker
float tinyDot(vec2 uv, vec2 center, float seed, float size) {
  float d = length(uv - center);
  // Flicker timing per dot
  float flickerSpeed = 0.4 + rnd(center + seed) * 0.8;
  float flickerPhase = rnd(center * 1.3 + seed) * 6.28318;
  float flicker = sin(time * flickerSpeed + flickerPhase) * 0.5 + 0.5;
  float pulse = pow(flicker, 2.5 + rnd(center * 2.1) * 1.5);
  // Tiny soft dot
  float intensity = smoothstep(size, size * 0.2, d) * pulse;
  return intensity;
}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec2 screenUv = FC / R;
  vec3 col=vec3(1);
  vec2 smokeUv = uv;
  smokeUv.x+=.25;
  smokeUv*=vec2(2,1);

  float n=fbm(smokeUv*.28-vec2(T*.01,0));
  n=noise(smokeUv*3.+n*2.);

  col.r-=fbm(smokeUv+vec2(0,T*.015)+n);
  col.g-=fbm(smokeUv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(smokeUv*1.006+vec2(0,T*.015)+n+.006);

  float luminance = dot(col, vec3(.21,.71,.07));
  col = mix(col, u_color, luminance);

  float glowFactor = smoothstep(0.3, 0.8, luminance) * u_glowIntensity;
  col += u_glowColor * glowFactor * 0.5;

  float pulse = sin(T * 0.5) * 0.5 + 0.5;
  col += u_glowColor * pulse * 0.05 * luminance;

  col *= u_brightness;

  // Mix with base color - u_baseMix controls how much base color remains (0 = fades to black, 1 = stays base color)
  // Fade in over time, but stop at (1.0 - u_baseMix) so base color is always visible
  float fadeAmount = min(time * 0.1, 1.0 - u_baseMix);
  col = mix(u_baseColor, col, fadeAmount);
  
  // === FLICKERING DOTS ON FAR EDGES ONLY ===
  float dotIntensity = 0.0;
  
  // Strict edge mask - only far left and far right
  float edgeW = u_dotEdgeWidth;
  float leftEdge = smoothstep(edgeW, 0.0, screenUv.x);
  float rightEdge = smoothstep(1.0 - edgeW, 1.0, screenUv.x);
  float edgeMask = max(leftEdge, rightEdge);
  
  if(edgeMask > 0.01) {
    float gridSize = 0.04 / max(u_dotDensity, 0.1);
    vec2 gridPos = floor(uv / gridSize);
    
    for(int x = -1; x <= 1; x++) {
      for(int y = -1; y <= 1; y++) {
        vec2 cell = gridPos + vec2(float(x), float(y));
        vec2 dotPos = (cell + vec2(rnd(cell), rnd(cell * 1.7))) * gridSize;
        float showDot = step(rnd(cell * 3.14), u_dotDensity * 0.15);
        dotIntensity += tinyDot(uv, dotPos, 42.0, u_dotSize) * showDot;
      }
    }
    dotIntensity *= edgeMask;
  }
  
  col += u_dotColor * dotIntensity * u_dotBrightness;
  col = clamp(col, 0.0, 1.0);
  
  O = vec4(col, 1);
}`;

// --- RENDERER CLASS ---
class Renderer {
  private readonly vertexSrc = "#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}";
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
  
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  
  // Smoke params
  private color: [number, number, number] = [0.1, 0.4, 0.9];
  private glowColor: [number, number, number] = [0.2, 0.6, 1.0];
  private glowIntensity: number = 0.6;
  private brightness: number = 1.0;
  private speed: number = 1.0;
  private baseColor: [number, number, number] = [0.02, 0.02, 0.05];
  private baseMix: number = 0.3;
  
  // Dot params
  private dotDensity: number = 0.5;
  private dotBrightness: number = 1.0;
  private dotColor: [number, number, number] = [1.0, 1.0, 1.0];
  private dotSize: number = 0.003;
  private dotEdgeWidth: number = 0.15;

  constructor(canvas: HTMLCanvasElement, fragmentSource: string) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
    this.setup(fragmentSource);
    this.init();
  }
  
  updateColor(c: [number, number, number]) { this.color = c; }
  updateGlowColor(c: [number, number, number]) { this.glowColor = c; }
  updateGlowIntensity(v: number) { this.glowIntensity = v; }
  updateBrightness(v: number) { this.brightness = v; }
  updateSpeed(v: number) { this.speed = v; }
  updateBaseColor(c: [number, number, number]) { this.baseColor = c; }
  updateBaseMix(v: number) { this.baseMix = v; }
  updateDotDensity(v: number) { this.dotDensity = v; }
  updateDotBrightness(v: number) { this.dotBrightness = v; }
  updateDotColor(c: [number, number, number]) { this.dotColor = c; }
  updateDotSize(v: number) { this.dotSize = v; }
  updateDotEdgeWidth(v: number) { this.dotEdgeWidth = v; }

  updateScale() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio, 2));
    const { innerWidth: width, innerHeight: height } = window;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
    }
  }

  reset() {
    const { gl, program, vs, fs } = this;
    if (!program) return;
    if (vs) { gl.detachShader(program, vs); gl.deleteShader(vs); }
    if (fs) { gl.detachShader(program, fs); gl.deleteShader(fs); }
    gl.deleteProgram(program);
    this.program = null;
  }

  private setup(fragmentSource: string) {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!this.vs || !this.fs || !program) return;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, fragmentSource);
    this.program = program;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(`Program linking error: ${gl.getProgramInfoLog(this.program)}`);
    }
  }

  private init() {
    const { gl, program } = this;
    if (!program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    Object.assign(program, {
      resolution: gl.getUniformLocation(program, "resolution"),
      time: gl.getUniformLocation(program, "time"),
      u_color: gl.getUniformLocation(program, "u_color"),
      u_glowColor: gl.getUniformLocation(program, "u_glowColor"),
      u_glowIntensity: gl.getUniformLocation(program, "u_glowIntensity"),
      u_brightness: gl.getUniformLocation(program, "u_brightness"),
      u_speed: gl.getUniformLocation(program, "u_speed"),
      u_baseColor: gl.getUniformLocation(program, "u_baseColor"),
      u_baseMix: gl.getUniformLocation(program, "u_baseMix"),
      u_dotDensity: gl.getUniformLocation(program, "u_dotDensity"),
      u_dotBrightness: gl.getUniformLocation(program, "u_dotBrightness"),
      u_dotColor: gl.getUniformLocation(program, "u_dotColor"),
      u_dotSize: gl.getUniformLocation(program, "u_dotSize"),
      u_dotEdgeWidth: gl.getUniformLocation(program, "u_dotEdgeWidth"),
    });
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f((program as any).resolution, canvas.width, canvas.height);
    gl.uniform1f((program as any).time, now * 1e-3);
    gl.uniform3fv((program as any).u_color, this.color);
    gl.uniform3fv((program as any).u_glowColor, this.glowColor);
    gl.uniform1f((program as any).u_glowIntensity, this.glowIntensity);
    gl.uniform1f((program as any).u_brightness, this.brightness);
    gl.uniform1f((program as any).u_speed, this.speed);
    gl.uniform3fv((program as any).u_baseColor, this.baseColor);
    gl.uniform1f((program as any).u_baseMix, this.baseMix);
    gl.uniform1f((program as any).u_dotDensity, this.dotDensity);
    gl.uniform1f((program as any).u_dotBrightness, this.dotBrightness);
    gl.uniform3fv((program as any).u_dotColor, this.dotColor);
    gl.uniform1f((program as any).u_dotSize, this.dotSize);
    gl.uniform1f((program as any).u_dotEdgeWidth, this.dotEdgeWidth);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// --- UTILITY ---
const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : null;
};

// --- REACT COMPONENT ---
interface SmokeBackgroundProps {
  smokeColor?: string;
  glowColor?: string;
  glowIntensity?: number;
  brightness?: number;
  speed?: number;
  baseColor?: string;        // Background/dark areas color
  baseMix?: number;          // 0.0-1.0 how much base color stays visible (0 = fades to black, 1 = stays baseColor)
  dotDensity?: number;       // 0.0-1.0 how many dots
  dotBrightness?: number;    // 0.0-2.0 dot brightness
  dotColor?: string;         // Dot color hex
  dotSize?: number;          // 0.001-0.01 dot size
  dotEdgeWidth?: number;     // 0.05-0.25 how far from edge dots appear
  className?: string;
}

export const SmokeBackground: React.FC<SmokeBackgroundProps> = ({ 
  smokeColor = "#0a1628",
  glowColor = "#3B82F6",
  glowIntensity = 0.5,
  brightness = 0.5,
  speed = 1.0,
  baseColor = "#050510",
  baseMix = 0.3,
  dotDensity = 0.5,
  dotBrightness = 0.8,
  dotColor = "#ffffff",
  dotSize = 0.003,
  dotEdgeWidth = 0.12,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new Renderer(canvas, fragmentShaderSource);
    rendererRef.current = renderer;
    
    const rgbColor = hexToRgb(smokeColor);
    if (rgbColor) renderer.updateColor(rgbColor);
    const rgbGlow = hexToRgb(glowColor);
    if (rgbGlow) renderer.updateGlowColor(rgbGlow);
    const rgbBase = hexToRgb(baseColor);
    if (rgbBase) renderer.updateBaseColor(rgbBase);
    const rgbDot = hexToRgb(dotColor);
    if (rgbDot) renderer.updateDotColor(rgbDot);
    
    renderer.updateGlowIntensity(glowIntensity);
    renderer.updateBrightness(brightness);
    renderer.updateSpeed(speed);
    renderer.updateBaseMix(baseMix);
    renderer.updateDotDensity(dotDensity);
    renderer.updateDotBrightness(dotBrightness);
    renderer.updateDotSize(dotSize);
    renderer.updateDotEdgeWidth(dotEdgeWidth);
    
    const handleResize = () => renderer.updateScale();
    handleResize();
    window.addEventListener('resize', handleResize);
    
    let animationFrameId: number;
    const loop = (now: number) => {
      renderer.render(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    loop(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.reset(); 
    };
  }, []);
  
  useEffect(() => {
    const r = rendererRef.current;
    if (r) { const c = hexToRgb(smokeColor); if (c) r.updateColor(c); }
  }, [smokeColor]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) { const c = hexToRgb(glowColor); if (c) r.updateGlowColor(c); }
  }, [glowColor]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) { const c = hexToRgb(baseColor); if (c) r.updateBaseColor(c); }
  }, [baseColor]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) { const c = hexToRgb(dotColor); if (c) r.updateDotColor(c); }
  }, [dotColor]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateGlowIntensity(glowIntensity);
  }, [glowIntensity]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateBrightness(brightness);
  }, [brightness]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateSpeed(speed);
  }, [speed]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateBaseMix(baseMix);
  }, [baseMix]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateDotDensity(dotDensity);
  }, [dotDensity]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateDotBrightness(dotBrightness);
  }, [dotBrightness]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateDotSize(dotSize);
  }, [dotSize]);

  useEffect(() => {
    const r = rendererRef.current;
    if (r) r.updateDotEdgeWidth(dotEdgeWidth);
  }, [dotEdgeWidth]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`block ${className}`}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
};

export default SmokeBackground;
