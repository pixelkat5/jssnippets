import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { logo } from '../lib/constants'

interface StarInfo {
  twinkling: boolean
  opacity: number
  increasing: boolean
  twinkleSpeed: number
  characterOverride?: string
}

interface Meteor {
  x: number
  y: number
  length: number
  angle: number
  speed: number
  opacity: number
}

interface AnimatedLogoChar {
  character: string
  target: string
  revealed: boolean
}

type AnimatedLogoLine = AnimatedLogoChar[]

interface GalaxyState {
  fontSize: number
  scale: number
  width: number
  height: number
  columns: number
  rows: number
  centerX: number
  centerY: number
  codeActivated: boolean
  windowFocused: boolean
  renderLogo: boolean
  logoColor: string
  logoOpacity: number
  allowMeteors: boolean
  starInfo: StarInfo[]
  meteors: Meteor[]
  animatedLogo: AnimatedLogoLine[]
  meteorTimeoutId: ReturnType<typeof setTimeout> | null
}

export default function Galaxy() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [logoOpacity, setLogoOpacity] = useState(1)
  const [triggered, setTriggered] = useState(false)

  const logoHeight = logo.length
  const logoWidth = logo[0].length

  const stateRef = useRef<GalaxyState>({
    fontSize: 13,
    scale: 15,
    width: 0,
    height: 0,
    columns: 0,
    rows: 0,
    centerX: 0,
    centerY: 0,
    codeActivated: false,
    windowFocused: true,
    renderLogo: true,
    logoColor: 'rgba(255, 255, 255, 255)',
    logoOpacity: 1,
    allowMeteors: true,
    starInfo: [],
    meteors: [],
    animatedLogo: [],
    meteorTimeoutId: null,
  })

  const pickOverrideCharacter = useCallback((): string => {
    const overrides = ['+', '*', 'o', '@', ' ']
    return overrides[Math.floor(Math.random() * overrides.length)]
  }, [])

  const calculateSizes = useCallback((): void => {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    state.width = parent ? parent.clientWidth : window.innerWidth
    state.height = parent ? parent.clientHeight : window.innerHeight
    state.columns = Math.floor(state.width / state.fontSize)
    state.rows = Math.floor(state.height / state.fontSize)
    state.centerX = state.columns / 2
    state.centerY = state.rows / 2
    canvas.width = state.width
    canvas.height = state.height
  }, [])

  const initializeStars = useCallback((): void => {
    const state = stateRef.current
    state.starInfo = []
    for (let col = 0; col < state.columns; col++) {
      for (let row = 0; row < state.rows; row++) {
        state.starInfo.push({
          twinkling: Math.random() < 0.15,
          opacity: Math.random(),
          increasing: Math.random() < 0.5,
          twinkleSpeed: 0.002 + Math.random() * 0.05,
          characterOverride: Math.random() < 0.02 ? pickOverrideCharacter() : undefined,
        })
      }
    }
  }, [pickOverrideCharacter])

  const initializeLogoAnimation = useCallback((): void => {
    const state = stateRef.current
    state.animatedLogo = logo.map((line) =>
      [...line].map((character) => ({ character: ' ', target: character, revealed: false }))
    )
    const scrambleInterval = setInterval(() => {
      let stillScrambling = false
      for (const line of state.animatedLogo) {
        for (const charInfo of line) {
          if (!charInfo.revealed) {
            stillScrambling = true
            if (Math.random() < 0.1) {
              charInfo.character = charInfo.target
              charInfo.revealed = true
            }
          }
        }
      }
      if (!stillScrambling) clearInterval(scrambleInterval)
    }, 50)
  }, [])

  const spawnMeteor = useCallback((): void => {
    const state = stateRef.current
    if (Math.random() < 0.5 || !state.windowFocused) return
    const x = -350 + Math.random() * (state.width - 50)
    const y = -50
    const length = 20 + Math.random() * 80
    const angleDegrees = 45 - 10 + Math.random() * 20
    const angle = (angleDegrees * Math.PI) / 180
    const speed = 10 + Math.random() * 10
    state.meteors.push({ x, y, length, angle, speed, opacity: 1 })
  }, [])

  const scheduleNextMeteor = useCallback((): void => {
    const state = stateRef.current
    const delay = 50 + Math.random() * 2000
    state.meteorTimeoutId = setTimeout(() => {
      if (state.allowMeteors) spawnMeteor()
      scheduleNextMeteor()
    }, delay)
  }, [spawnMeteor])

  const updateMeteors = useCallback((): void => {
    const state = stateRef.current
    for (let index = state.meteors.length - 1; index >= 0; index--) {
      const meteor = state.meteors[index]
      meteor.x += meteor.speed * Math.cos(meteor.angle)
      meteor.y += meteor.speed * Math.sin(meteor.angle)
      if (meteor.y > state.height) state.meteors.splice(index, 1)
    }
  }, [])

  const drawMeteors = useCallback((context: CanvasRenderingContext2D): void => {
    const state = stateRef.current
    for (const meteor of state.meteors) {
      const gradient = context.createLinearGradient(
        meteor.x, meteor.y,
        meteor.x - meteor.length * Math.cos(meteor.angle),
        meteor.y - meteor.length * Math.sin(meteor.angle),
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      context.beginPath()
      context.lineWidth = 2
      context.lineCap = 'round'
      context.strokeStyle = gradient
      context.moveTo(meteor.x, meteor.y)
      context.lineTo(
        meteor.x - meteor.length * Math.cos(meteor.angle),
        meteor.y - meteor.length * Math.sin(meteor.angle),
      )
      context.stroke()
    }
  }, [])

  const isInLogoArea = useCallback((x: number, y: number): boolean => {
    const state = stateRef.current
    if (!state.renderLogo) return false
    const logoTop = (state.centerY - logoHeight / 2) * state.fontSize
    const logoBottom = (state.centerY + logoHeight / 2) * state.fontSize
    const logoLeft = (state.centerX - logoWidth / 2) * state.fontSize
    const logoRight = (state.centerX + logoWidth / 2) * state.fontSize
    return x >= logoLeft && x <= logoRight && y >= logoTop && y <= logoBottom
  }, [logoHeight, logoWidth])

  const chooseCharacter = useCallback((col: number, row: number, star: StarInfo): string => {
    const state = stateRef.current
    const distance = Math.hypot(col - state.centerX, row - state.centerY)
    if (distance < 10) return ' '
    if (star.characterOverride) return star.characterOverride
    if (distance < 30) return '.'
    if (distance < 35) return '+'
    if (distance < 50) return '*'
    return '#'
  }, [])

  const drawLogo = useCallback((context: CanvasRenderingContext2D): void => {
    const state = stateRef.current
    if (!state.renderLogo) return
    context.font = `${state.fontSize}px monospace`
    const longestLine = logo.reduce((a, b) => a.length > b.length ? a : b)
    const textWidth = context.measureText(longestLine).width
    const startX = state.width / 2 - textWidth / 2
    const startY = state.height / 2 - (logoHeight * state.fontSize) / 2
    for (const [index, line] of state.animatedLogo.entries()) {
      const text = line.map((charInfo) => charInfo.character).join('')
      context.fillStyle = state.logoColor
      context.fillText(text, startX, startY + index * state.fontSize)
    }
  }, [logoHeight, logoWidth])

  const draw = useCallback((): void => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    const state = stateRef.current
    context.clearRect(0, 0, state.width, state.height)
    context.font = `${state.fontSize}px monospace`
    updateMeteors()
    drawMeteors(context)
    const currentTime = Date.now() * 0.0015
    for (let col = 0; col < state.columns; col++) {
      for (let row = 0; row < state.rows; row++) {
        const index = col * state.rows + row
        const star = state.starInfo[index]
        if (!star) continue
        if (star.twinkling && Date.now() % 2 === 0) {
          if (star.increasing) {
            star.opacity += star.twinkleSpeed
            if (star.opacity >= 1) star.increasing = false
          } else {
            star.opacity -= star.twinkleSpeed
            if (star.opacity <= 0) star.increasing = true
          }
        }
        const dist = Math.max(0.0001, Math.hypot(col - state.centerX, row - state.centerY))
        const angle = currentTime / dist
        const transformedX = (col - state.centerX) * Math.cos(angle) + (row - state.centerY) * Math.sin(angle)
        const transformedY = -(col - state.centerX) * Math.sin(angle) + (row - state.centerY) * Math.cos(angle)
        const x = state.centerX * state.fontSize + transformedX * state.scale
        const y = state.centerY * state.fontSize + transformedY * state.scale
        const character = chooseCharacter(col, row, star)
        let color = `rgba(120, 125, 130, ${star.opacity})`
        if (isInLogoArea(x, y)) {
          color = `rgba(120, 125, 130, ${star.opacity * 0.5})`
        } else if (star.twinkling) {
          const r = Math.round(108 + (255 - 108) * star.opacity)
          const g = Math.round(112 + (255 - 112) * star.opacity)
          const b = Math.round(115 + (255 - 115) * star.opacity)
          color = `rgba(${r}, ${g}, ${b}, ${star.opacity})`
        }
        context.fillStyle = color
        context.fillText(character, x, y)
      }
    }
    drawLogo(context)
    animationFrameRef.current = requestAnimationFrame(draw)
  }, [updateMeteors, drawMeteors, chooseCharacter, isInLogoArea, drawLogo])

  const codeTrigger = useCallback((): void => {
    const state = stateRef.current
    state.allowMeteors = false
    let opacity = 1
    const fadeOut = setInterval(() => {
      state.logoColor = `rgba(255, 255, 255, ${opacity})`
      setLogoOpacity(opacity)
      opacity -= 0.02
      if (opacity <= 0) {
        state.renderLogo = false
        clearInterval(fadeOut)
      }
    }, 20)
    const clearStars = setInterval(() => {
      let allStarsFaded = true
      for (const star of state.starInfo) {
        if (star.opacity > 0) {
          if (Math.random() < 0.6) {
            star.twinkling = false
            star.opacity = Math.max(star.opacity - Math.random() * 0.2, 0)
          }
          if (star.opacity > 0) allStarsFaded = false
        }
      }
      if (allStarsFaded) clearInterval(clearStars)
    }, 100)
    const exitValidator = setInterval(() => {
      if (!state.renderLogo) {
        setTriggered(true)
        if (state.starInfo.every((star) => star.opacity === 0)) {
          if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
          state.meteors.length = 0
          state.starInfo.length = 0
          clearInterval(exitValidator)
        }
      }
    }, 2000)
  }, [])

  const handleButtonClick = useCallback((): void => {
    const state = stateRef.current
    if (state.codeActivated) return
    state.codeActivated = true
    codeTrigger()
  }, [codeTrigger])

  useEffect(() => {
    calculateSizes()
    initializeStars()
    initializeLogoAnimation()
    scheduleNextMeteor()
    animationFrameRef.current = requestAnimationFrame(draw)
    const handleResize = () => {
      calculateSizes()
      if (!stateRef.current.codeActivated) initializeStars()
    }
    window.addEventListener('resize', handleResize)
    const ro = new ResizeObserver(handleResize)
    const canvasParent = canvasRef.current?.parentElement
    if (canvasParent) ro.observe(canvasParent)
    document.addEventListener('visibilitychange', () => {
      stateRef.current.windowFocused = document.visibilityState !== 'hidden'
    })
    return () => {
      const state = stateRef.current
      state.meteors.length = 0
      state.starInfo.length = 0
      if (state.meteorTimeoutId) clearTimeout(state.meteorTimeoutId)
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
    }
  }, [calculateSizes, initializeStars, initializeLogoAnimation, scheduleNextMeteor, draw])

  const buttonStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: '50%',
    top: '50%',
    transform: `translate(-50%, ${logoHeight / 2}rem)`,
    zIndex: 1000,
    opacity: logoOpacity,
  }), [logoHeight, logoOpacity])

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {triggered && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'monospace', fontSize: '1.5rem',
        }}>
          System entered.
        </div>
      )}
      {stateRef.current.renderLogo && (
        <button onClick={handleButtonClick} style={buttonStyle} className="enter-btn">
          Enter System
        </button>
      )}
    </div>
  )
}
