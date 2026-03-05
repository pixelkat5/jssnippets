import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, wrapEffect } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import { forwardRef, useEffect, useRef } from 'react'
import * as THREE from 'three'

const waveVertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`

const waveFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  float l = length(p);
  vec2 dir = (l > 0.0001) ? p / l : vec2(0.0);
  float t = time * waveSpeed;
  float cycle = 2.0;
  float phase1 = fract(t);
  float phase2 = fract(t + 0.5);
  float w1 = 1.0 - abs(2.0 * phase1 - 1.0);
  float w2 = 1.0 - abs(2.0 * phase2 - 1.0);
  vec2 uv1 = p + dir * (phase1 - 0.5) * cycle;
  vec2 uv2 = p + dir * (phase2 - 0.5) * cycle;
  float n1 = fbm(uv1 + fbm(uv1));
  float n2 = fbm(uv2 + fbm(uv2));
  return n1 * w1 + n2 * w2;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  float dist = length(uv);
  float holeRadius = 0.07;
  float mask = smoothstep(holeRadius, holeRadius + 0.05, dist);
  f *= mask;
  vec3 col = mix(color1, color2, smoothstep(0.0, 0.7, f));
  col = mix(col, color3, smoothstep(0.5, 1.2, f));
  gl_FragColor = vec4(col, 1.0);
}
`

const ditherFragmentShader = `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
uniform vec3 palette[32];
uniform int paletteSize;

const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 getClosest(vec3 c) {
  float minDst = 100.0;
  vec3 best = palette[0];
  for (int i = 0; i < 32; i++) {
    if (i >= paletteSize) break;
    float d = distance(c, palette[i]);
    if (d < minDst) { minDst = d; best = palette[i]; }
  }
  return best;
}

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.5;
  color += threshold * 0.1;
  return getClosest(color);
}

void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv, color.rgb);
  outputColor = color;
}
`

class RetroEffectImpl extends Effect {
  public override uniforms: Map<string, THREE.Uniform<any>>
  constructor() {
    const uniforms = new Map<string, THREE.Uniform<any>>([
      ['colorNum', new THREE.Uniform(4.0)],
      ['pixelSize', new THREE.Uniform(2.0)],
      ['palette', new THREE.Uniform(new Array(32).fill(new THREE.Vector3(0, 0, 0)))],
      ['paletteSize', new THREE.Uniform(0)],
    ])
    super('RetroEffect', ditherFragmentShader, { uniforms })
    this.uniforms = uniforms
  }
  set palette(value: [string, string, string]) {
    const c1 = new THREE.Color(value[0])
    const c2 = new THREE.Color(value[1])
    const c3 = new THREE.Color(value[2])
    const palette: THREE.Vector3[] = []
    const stepsPerSegment = 12
    for (let i = 0; i < stepsPerSegment; i++) {
      const t = i / (stepsPerSegment - 1)
      const c = new THREE.Color().lerpColors(c1, c2, t)
      const hsl = { h: 0, s: 0, l: 0 }
      c.getHSL(hsl)
      c.setHSL(hsl.h, Math.min(1.0, hsl.s * 1.2), hsl.l)
      palette.push(new THREE.Vector3(c.r, c.g, c.b))
    }
    for (let i = 1; i < stepsPerSegment; i++) {
      const t = i / (stepsPerSegment - 1)
      const c = new THREE.Color().lerpColors(c2, c3, t)
      const hsl = { h: 0, s: 0, l: 0 }
      c.getHSL(hsl)
      c.setHSL(hsl.h, Math.min(1.0, hsl.s * 1.2), hsl.l)
      palette.push(new THREE.Vector3(c.r, c.g, c.b))
    }
    while (palette.length < 32) palette.push(new THREE.Vector3(0, 0, 0))
    this.uniforms.get('palette')!.value = palette
    this.uniforms.get('paletteSize')!.value = stepsPerSegment * 2 - 1
  }
}

const RetroEffect = forwardRef<RetroEffectImpl, { colorNum: number; pixelSize: number; colors: [string, string, string] }>(
  (props, ref) => {
    const { colorNum, pixelSize, colors } = props
    const WrappedRetroEffect = wrapEffect(RetroEffectImpl)
    return <WrappedRetroEffect ref={ref} colorNum={colorNum} pixelSize={pixelSize} palette={colors} />
  }
)
RetroEffect.displayName = 'RetroEffect'

interface WaveUniforms {
  [key: string]: THREE.Uniform<any>
  time: THREE.Uniform<number>
  resolution: THREE.Uniform<THREE.Vector2>
  waveSpeed: THREE.Uniform<number>
  waveFrequency: THREE.Uniform<number>
  waveAmplitude: THREE.Uniform<number>
  color1: THREE.Uniform<THREE.Color>
  color2: THREE.Uniform<THREE.Color>
  color3: THREE.Uniform<THREE.Color>
}

interface DitheredWavesProps {
  waveSpeed: number
  waveFrequency: number
  waveAmplitude: number
  colors: [string, string, string]
  colorNum: number
  pixelSize: number
  disableAnimation: boolean
}

function DitheredWavesInner({ waveSpeed, waveFrequency, waveAmplitude, colors, colorNum, pixelSize, disableAnimation }: DitheredWavesProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const { viewport, size, gl } = useThree()

  const waveUniformsRef = useRef<WaveUniforms>({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    color1: new THREE.Uniform(new THREE.Color(colors[0])),
    color2: new THREE.Uniform(new THREE.Color(colors[1])),
    color3: new THREE.Uniform(new THREE.Color(colors[2])),
  })

  useEffect(() => {
    const dpr = gl.getPixelRatio()
    waveUniformsRef.current.resolution.value.set(
      Math.floor(size.width * dpr),
      Math.floor(size.height * dpr)
    )
  }, [size, gl])

  useFrame(({ clock }) => {
    if (!disableAnimation) {
      waveUniformsRef.current.time.value = clock.getElapsedTime()
    }
  })

  return (
    <>
      <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={waveVertexShader}
          fragmentShader={waveFragmentShader}
          uniforms={waveUniformsRef.current}
        />
      </mesh>
      <EffectComposer>
        <RetroEffect colorNum={colorNum} pixelSize={pixelSize} colors={colors} />
      </EffectComposer>
    </>
  )
}

export default function DitheredWaves({ dpr = 1 }: { dpr?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (glRef.current && el) {
        glRef.current.setSize(el.offsetWidth, el.offsetHeight)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        key={dpr}
        camera={{ position: [0, 0, 6] }}
        dpr={dpr}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        onCreated={({ gl }) => {
          glRef.current = gl
          if (containerRef.current) {
            gl.setSize(containerRef.current.offsetWidth, containerRef.current.offsetHeight)
          }
        }}
      >
        <DitheredWavesInner
          waveSpeed={0.02}
          waveFrequency={4}
          waveAmplitude={0.45}
          colors={['#000000', '#071C60', '#FF6735']}
          colorNum={8}
          pixelSize={3}
          disableAnimation={false}
        />
      </Canvas>
    </div>
  )
}
