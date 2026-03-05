import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;
void main() {
    vUv = uv;
    float time = uTime * 5.;
    vec3 p = position;
    p.x += sin(time + position.y) * 0.4 * uEnableWaves;
    p.y += cos(time + position.z) * 0.15 * uEnableWaves;
    p.z += sin(time + position.x) * 0.70 * uEnableWaves;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;
void main() {
    vec2 pos = vUv;
    float r = texture2D(uTexture, pos + cos(uTime*2.-uTime+pos.x)*.01).r;
    float g = texture2D(uTexture, pos + tan(uTime*.5+pos.x-uTime)*.01).g;
    float b = texture2D(uTexture, pos - cos(uTime*2.+uTime+pos.y)*.01).b;
    float a = texture2D(uTexture, pos).a;
    gl_FragColor = vec4(r, g, b, a);
}
`

function map(n: number, s1: number, e1: number, s2: number, e2: number) {
  return ((n - s1) / (e1 - s1)) * (e2 - s2) + s2
}

const CHARSET = ' .:-=+*#%@'

function buildTextCanvas(text: string, fontSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = `bold ${fontSize}px monospace`
  ctx.font = font
  const m = ctx.measureText(text)
  const w = Math.ceil(m.width) + fontSize
  const h = fontSize * 1.4
  canvas.width = w
  canvas.height = h
  ctx.font = font
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, fontSize / 2, h / 2)
  return canvas
}

export interface TextHeroProps {
  text?: string
  asciiFontSize?: number
  textFontSize?: number
  planeBaseHeight?: number
}

export default function TextHero({
  text = 'Hello',
  asciiFontSize = 8,
  textFontSize = 180,
  planeBaseHeight = 12,
}: TextHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mountedRef.current) return
    mountedRef.current = true

    const { width, height } = container.getBoundingClientRect()
    if (!width || !height) return

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(width, height)

    const charW = asciiFontSize * 0.6
    const cols = Math.floor(width / charW)
    const rows = Math.floor(height / asciiFontSize)
    const asciiCanvas = document.createElement('canvas')
    asciiCanvas.width = cols
    asciiCanvas.height = rows
    const asciiCtx = asciiCanvas.getContext('2d', { willReadFrequently: true })!
    asciiCtx.imageSmoothingEnabled = false

    const pre = document.createElement('pre')
    pre.style.cssText = `
      position:absolute; inset:0;
      margin:0; padding:0;
      font-family:monospace;
      font-size:${asciiFontSize}px;
      line-height:${asciiFontSize}px;
      white-space:pre;
      overflow:hidden;
      background-image: radial-gradient(circle, #ff6188 0%, #fc9867 50%, #ffd866 100%);
      background-attachment: fixed;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      user-select: none;
      pointer-events: none;
      z-index: 2;
    `
    container.appendChild(pre)

    const scene = new THREE.Scene()
    const fov = 50
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000)
    const dist = (planeBaseHeight / 2) / Math.tan((fov / 2) * (Math.PI / 180)) * 2.5
    camera.position.z = dist

    const textCanvas = buildTextCanvas(text, textFontSize)
    const texture = new THREE.CanvasTexture(textCanvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    const aspect = textCanvas.width / textCanvas.height
    const geo = new THREE.PlaneGeometry(planeBaseHeight * aspect, planeBaseHeight, 40, 20)
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uEnableWaves: { value: 1.0 },
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    let rafId: number
    const render = () => {
      rafId = requestAnimationFrame(render)
      mat.uniforms.uTime.value = Date.now() * 0.001
      renderer.render(scene, camera)
      asciiCtx.clearRect(0, 0, cols, rows)
      asciiCtx.drawImage(renderer.domElement, 0, 0, cols, rows)
      const pixels = asciiCtx.getImageData(0, 0, cols, rows).data
      let str = ''
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4
          const a = pixels[i + 3]!
          if (a === 0) { str += ' '; continue }
          const brightness = (0.3 * pixels[i]! + 0.6 * pixels[i + 1]! + 0.1 * pixels[i + 2]!) / 255
          str += CHARSET[Math.floor(brightness * (CHARSET.length - 1))]
        }
        str += '\n'
      }
      pre.textContent = str
    }
    render()

    const onMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const rx = map(e.clientY, rect.top, rect.bottom, -0.45, 0.45)
      const ry = map(e.clientX, rect.left, rect.right, -0.35, 0.35)
      mesh.rotation.x += (rx - mesh.rotation.x) * 0.06
      mesh.rotation.y += (ry - mesh.rotation.y) * 0.06
    }
    document.addEventListener('mousemove', onMouse)

    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry!.contentRect
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMouse)
      ro.disconnect()
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      texture.dispose()
      if (container.contains(pre)) container.removeChild(pre)
    }
  }, [text, asciiFontSize, textFontSize, planeBaseHeight])

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0f', overflow: 'hidden' }}
    />
  )
}
