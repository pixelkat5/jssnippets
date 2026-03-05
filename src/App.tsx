import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import './App.css'

const DitheredWaves = lazy(() => import('./snippets/DitheredWaves'))
const Galaxy = lazy(() => import('./snippets/Galaxy'))
const TextHero = lazy(() => import('./snippets/TextHero'))

const BUILTIN_SNIPPETS = [
  {
    id: 'dithered-waves',
    name: 'DitheredWaves.tsx',
    description: 'Three.js WebGL shader with radial FBM noise and Bayer-matrix ordered dithering postprocess.',
    tags: ['Three.js', 'WebGL', 'Shader', 'Postprocessing'],
    componentKey: 'DitheredWaves',
    file: 'src/snippets/DitheredWaves.tsx',
    bytes: '12.4 KB',
    lines: 284,
  },
  {
    id: 'galaxy',
    name: 'Galaxy.tsx',
    description: 'Canvas star field with rotating ASCII characters, procedural meteors, and animated logo reveal sequence.',
    tags: ['Canvas 2D', 'Animation', 'ASCII'],
    componentKey: 'Galaxy',
    file: 'src/snippets/Galaxy.tsx',
    bytes: '9.1 KB',
    lines: 312,
  },
  {
    id: 'text-hero',
    name: 'TextHero.tsx',
    description: 'Three.js wavy 3D text downsampled and mapped to ASCII brightness chars. Mouse-reactive tilt.',
    tags: ['Three.js', 'ASCII', 'Mouse'],
    componentKey: 'TextHero',
    file: 'src/snippets/TextHero.tsx',
    bytes: '6.8 KB',
    lines: 198,
  },
]

const LOCAL_MODULES: Record<string, string> = {
  '@/lib/constants': [
    'export const logo = [',
    '  "                                                    ",',
    '  "  ______  ______  __      ______  __  __  __  __  ",',
    '  " /\\\\  ___\\/\\\\  __ \\/\\\\ \\\\    /\\\\  __ \\/\\\\_\\\\_\\\\_\\/\\\\ \\\\_\\\\ \\\\ ",',
    '  " \\\\ \\\\ \\\\__ \\\\ \\\\  __ \\\\ \\\\ \\\\___\\\\ \\\\  __ \\\\/_/\\\\/_/\\\\ \\\\____ \\\\",',
    '  "  \\\\ \\\\_____\\\\ \\\\_\\\\ \\\\_\\\\ \\\\_____\\\\ \\\\_\\\\ \\\\_\\\\ /\\\\_\\\\  \\\\/\\\\_____\\\\",',
    '  "   \\\\/_____/\\\\/_/\\\\/_/\\\\/_____/\\\\/_/\\\\/_/ \\\\/_/   \\\\/_____/",',
    '  "                                                    ",',
    ']',
  ].join('\n'),
}

type Snippet = {
  id: string
  name: string
  description: string
  tags: string[]
  componentKey: string
  file: string
  bytes: string
  lines: number
}

type CustomSnippet = {
  id: string
  name: string
  description: string
  tags: string[]
  code: string
  bytes: string
  lines: number
}

const TAG_META: Record<string, { color: string }> = {
  'Three.js':       { color: '#38bdf8' },
  'WebGL':          { color: '#4ade80' },
  'Shader':         { color: '#c084fc' },
  'Postprocessing': { color: '#fb923c' },
  'Canvas 2D':      { color: '#f87171' },
  'Animation':      { color: '#34d399' },
  'ASCII':          { color: '#facc15' },
  'Mouse':          { color: '#a78bfa' },
  'Custom':         { color: '#f472b6' },
  'React':          { color: '#61dafb' },
}

const LS_KEY = 'snippet-viewer:custom-v2'

function loadCustom(): CustomSnippet[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCustom(snippets: CustomSnippet[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(snippets))
}

function PreviewComponent({ componentKey, dpr }: { componentKey: string; dpr: number }) {
  if (componentKey === 'DitheredWaves') return <DitheredWaves dpr={dpr} />
  if (componentKey === 'Galaxy') return <Galaxy />
  if (componentKey === 'TextHero') return <TextHero text="Hello" asciiFontSize={7} textFontSize={200} planeBaseHeight={10} />
  return null
}

const CDN_MAP: Record<string, string> = {
  '@react-three/postprocessing': 'https://esm.sh/@react-three/postprocessing@2?deps=react@18,three@0.160,postprocessing@6',
  '@react-three/fiber':          'https://esm.sh/@react-three/fiber@8?deps=react@18,three@0.160',
  'react-dom/client':            'https://esm.sh/react-dom@18/client',
  'react/jsx-runtime':           'https://esm.sh/react@18/jsx-runtime',
  'postprocessing':              'https://esm.sh/postprocessing@6',
  'react-dom':                   'https://esm.sh/react-dom@18',
  'react':                       'https://esm.sh/react@18',
  'three':                       'https://esm.sh/three@0.160',
}

function buildSrcdoc(code: string): string {
  const codeB64 = btoa(unescape(encodeURIComponent(code)))
  const localMods = Object.entries(LOCAL_MODULES).map(([alias, src]) => ({
    alias,
    b64: btoa(unescape(encodeURIComponent(src))),
  }))
  const cdnB64 = btoa(unescape(encodeURIComponent(JSON.stringify(CDN_MAP))))
  const localB64 = btoa(unescape(encodeURIComponent(JSON.stringify(localMods))))

  const transformScript = [
    'window.__js=(function(){',
    '  try{',
    '    var raw=decodeURIComponent(escape(atob("' + codeB64 + '")));',
    '    var js=Babel.transform(raw,{presets:[["react",{runtime:"automatic"}],["typescript",{allExtensions:true,isTSX:true}]],filename:"snippet.tsx"}).code;',
    '    var cdn=JSON.parse(decodeURIComponent(escape(atob("' + cdnB64 + '"))));',
    '    Object.keys(cdn).forEach(function(k){var q=JSON.stringify(k);js=js.split(q).join(JSON.stringify(cdn[k]));var sq="\'" +k+ "\'";js=js.split(sq).join(JSON.stringify(cdn[k]));});',
    '    var lm=JSON.parse(decodeURIComponent(escape(atob("' + localB64 + '"))));',
    '    lm.forEach(function(m){',
    '      var url=URL.createObjectURL(new Blob([decodeURIComponent(escape(atob(m.b64)))],{type:"text/javascript"}));',
    '      js=js.split(JSON.stringify(m.alias)).join(JSON.stringify(url));js=js.split("\'"+m.alias+"\'").join(JSON.stringify(url));',
    '    });',
    '    return js;',
    '  }catch(e){return"__ERR__:"+e.message;}',
    '})();',
  ].join('')

  const moduleScript = [
    'function showErr(m){',
    '  var p=document.createElement("pre");',
    '  p.style.cssText="color:#f87171;padding:16px;white-space:pre-wrap;font-size:11px";',
    '  p.textContent=m;',
    '  document.getElementById("root").innerHTML="";',
    '  document.getElementById("root").appendChild(p);',
    '}',
    'window.addEventListener("error",function(e){showErr(e.message)});',
    'window.addEventListener("unhandledrejection",function(e){showErr(String(e.reason&&e.reason.message||e.reason))});',
    'var js=window.__js;',
    'if(!js||js.startsWith("__ERR__:")){',
    '  showErr(js?js.slice(8):"Babel transform failed");',
    '} else {',
    '  var blob=new Blob([js],{type:"text/javascript"});',
    '  import(URL.createObjectURL(blob)).then(function(mod){',
    '    if(mod.default&&typeof mod.default==="function"){',
    '      Promise.all([import("https://esm.sh/react@18"),import("https://esm.sh/react-dom@18/client")])',
    '        .then(function(m){m[1].createRoot(document.getElementById("root")).render(m[0].createElement(mod.default));})',
    '        .catch(function(e){showErr("React load error: "+e.message)});',
    '    } else {',
    '      showErr("No default export found. Add: export default function MyComponent() { ... }");',
    '    }',
    '  }).catch(function(e){showErr("Import error: "+e.message)});',
    '}',
  ].join('')

  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    '<script src="https://cdn.tailwindcss.com"><\/script>',
    '<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
    'html,body,#root{width:100%;height:100%;background:#000;color:#cdd6f4;font-family:monospace;overflow:hidden}',
    '#root>*{width:100%!important;height:100%!important}',
    '</style></head><body><div id="root">',
    '<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:8px;color:#45506a;font-size:11px;letter-spacing:.05em">',
    '<span>■</span><span>COMPILING...</span></div>',
    '</div>',
    '<script src="https://unpkg.com/@babel/standalone/babel.min.js"><' + '/script>',
    '<script>' + transformScript + '<' + '/script>',
    '<script type="module">' + moduleScript + '<' + '/script>',
    '</body></html>',
  ].join('\n')
}

function CustomPreview({ code }: { code: string }) {
  return (
    <iframe
      srcDoc={buildSrcdoc(code)}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      title="Custom snippet preview"
    />
  )
}

function AddSnippetModal({ onClose, onSave }: { onClose: () => void; onSave: (s: CustomSnippet) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [tagsRaw, setTagsRaw] = useState('Custom')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!code.trim()) { setError('Code is required.'); return }
    const lines = code.split('\n').length
    const bytes = new Blob([code]).size
    const byteStr = bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const id = `custom-${Date.now()}`
    const rawName = name.trim()
    const knownExts = ['.js', '.ts', '.tsx', '.jsx']
    const finalName = knownExts.some(e => rawName.endsWith(e)) ? rawName : rawName + '.tsx'
    onSave({
      id,
      name: finalName,
      description: description.trim() || 'Custom snippet',
      tags: tags.length ? tags : ['Custom'],
      bytes: byteStr,
      lines,
      code,
    })
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">// ADD SNIPPET</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row">
            <label className="modal-label">NAME</label>
            <input className="modal-input" placeholder="MyEffect.tsx" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="modal-row">
            <label className="modal-label">DESCRIPTION</label>
            <input className="modal-input" placeholder="What does this do?" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="modal-row">
            <label className="modal-label">TAGS</label>
            <input className="modal-input" placeholder="React, Canvas 2D" value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} />
          </div>
          <div className="modal-row modal-row--col">
            <div className="modal-code-header">
              <label className="modal-label">CODE</label>
              <div className="modal-code-hints">
                <span>React · Three.js · @/lib/constants supported</span>
                <button
                  className={'modal-preview-toggle' + (preview ? ' active' : '')}
                  onClick={() => setPreview(p => !p)}
                >
                  {preview ? '◀ EDIT' : 'PREVIEW ▶'}
                </button>
              </div>
            </div>
            {preview ? (
              <div className="modal-preview-frame">
                <CustomPreview code={code} />
              </div>
            ) : (
              <textarea
                className="modal-textarea"
                placeholder={'// Paste TSX here. Supports React, hooks, Three.js, @/lib/constants.\n// Must have a default export: export default function MyComponent() { ... }'}
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
              />
            )}
          </div>
          {error && <div className="modal-error">⚠ {error}</div>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn--ghost" onClick={onClose}>CANCEL</button>
          <button className="modal-btn modal-btn--save" onClick={handleSave}>SAVE SNIPPET</button>
        </div>
      </div>
    </div>
  )
}

function PreviewPane({
  isCustom,
  activeKey,
  customSnippet,
  dpr,
}: {
  isCustom: boolean
  activeKey: string
  customSnippet: CustomSnippet | undefined
  dpr: number
}) {
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    if (isCustom) {
      setShowCustom(false)
      const t = setTimeout(() => setShowCustom(true), 300)
      return () => clearTimeout(t)
    } else {
      setShowCustom(false)
    }
  }, [isCustom, activeKey])

  if (!isCustom) {
    return (
      <Suspense key={activeKey} fallback={<div className="loading"><span className="loading-dot">■</span><span>LOADING MODULE...</span></div>}>
        <PreviewComponent componentKey={activeKey} dpr={dpr} />
      </Suspense>
    )
  }

  if (!showCustom || !customSnippet) {
    return (
      <div className="loading">
        <span className="loading-dot">■</span>
        <span>RELEASING GPU CONTEXT...</span>
      </div>
    )
  }

  return <CustomPreview key={customSnippet.id} code={customSnippet.code} />
}

export default function App() {
  const [customSnippets, setCustomSnippets] = useState<CustomSnippet[]>(loadCustom)
  const [activeIdx, setActiveIdx] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [dpr, setDpr] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [ctrlHeld, setCtrlHeld] = useState(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })

  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaMode === 1 ? e.deltaY * 0.05 : e.deltaY * 0.002
      setZoom(z => Math.min(3, Math.max(0.3, z * (1 - delta))))
    }
    function onMouseDown(e: MouseEvent) {
      if (e.button !== 1 && !e.altKey) return
      e.preventDefault()
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      setPan(p => { panOrigin.current = p; return p })
      el!.style.cursor = 'grabbing'
    }
    function onMouseMove(e: MouseEvent) {
      if (!isPanning.current) return
      setPan({ x: panOrigin.current.x + e.clientX - panStart.current.x, y: panOrigin.current.y + e.clientY - panStart.current.y })
    }
    function onMouseUp() {
      if (!isPanning.current) return
      isPanning.current = false
      el!.style.cursor = ''
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrlHeld(true) }
    const up = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrlHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const totalCount = BUILTIN_SNIPPETS.length + customSnippets.length
  const isCustom = activeIdx >= BUILTIN_SNIPPETS.length
  const builtinSnippet: Snippet | undefined = !isCustom ? BUILTIN_SNIPPETS[activeIdx] : undefined
  const customSnippet: CustomSnippet | undefined = isCustom ? customSnippets[activeIdx - BUILTIN_SNIPPETS.length] : undefined

  const activeName        = builtinSnippet?.name        ?? customSnippet?.name        ?? ''
  const activeDescription = builtinSnippet?.description ?? customSnippet?.description ?? ''
  const activeTags        = builtinSnippet?.tags        ?? customSnippet?.tags        ?? []
  const activeFile        = builtinSnippet?.file        ?? ('custom/' + (customSnippet?.name ?? ''))
  const activeLines       = builtinSnippet?.lines       ?? customSnippet?.lines       ?? 0
  const activeBytes       = builtinSnippet?.bytes       ?? customSnippet?.bytes       ?? '-'
  const activeKey         = builtinSnippet?.componentKey ?? customSnippet?.id         ?? ''

  function handleDprChange(v: number) {
    setDpr(v)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function handleSave(s: CustomSnippet) {
    const updated = [...customSnippets, s]
    setCustomSnippets(updated)
    saveCustom(updated)
    setActiveIdx(BUILTIN_SNIPPETS.length + updated.length - 1)
    setShowModal(false)
  }

  function handleDelete(id: string) {
    const updated = customSnippets.filter(s => s.id !== id)
    setCustomSnippets(updated)
    saveCustom(updated)
    setActiveIdx(0)
  }

  return (
    <div className="app">
      {showModal && <AddSnippetModal onClose={() => setShowModal(false)} onSave={handleSave} />}

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="wordmark">
            <span className="wordmark-main">JS</span><span className="wordmark-accent">Snippets</span>
          </div>
          <div className="header-meta">{totalCount} components</div>
        </div>

        <div className="sidebar-section-label">// components</div>

        <nav className="sidebar-nav">
          {BUILTIN_SNIPPETS.map((s, i) => (
            <button key={s.id} className={'file-btn' + (i === activeIdx ? ' active' : '')} onClick={() => setActiveIdx(i)}>
              <div className="file-btn-top">
                <span className="file-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="file-name">{s.name}</span>
              </div>
              <div className="file-btn-meta">
                <span>{s.lines} lines</span>
                <span>{s.bytes}</span>
              </div>
            </button>
          ))}

          {customSnippets.length > 0 && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 8 }}>// custom</div>
              {customSnippets.map((s, i) => {
                const idx = BUILTIN_SNIPPETS.length + i
                return (
                  <button key={s.id} className={'file-btn' + (idx === activeIdx ? ' active' : '')} onClick={() => setActiveIdx(idx)}>
                    <div className="file-btn-top">
                      <span className="file-index">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="file-name">{s.name}</span>
                      <span className="file-delete" title="Delete" onClick={e => { e.stopPropagation(); handleDelete(s.id) }}>✕</span>
                    </div>
                    <div className="file-btn-meta">
                      <span>{s.lines} lines</span>
                      <span>{s.bytes}</span>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </nav>

        <button className="add-btn" onClick={() => setShowModal(true)}>
          <span className="add-btn-plus">+</span>
          <span>NEW SNIPPET</span>
        </button>

        <div className="sidebar-footer">
          <div className="footer-row">
            <span className="footer-label">STATUS</span>
            <span className="footer-ok">● LIVE</span>
          </div>
          <div className="footer-row">
            <span className="footer-label">DEPS</span>
            <span className="footer-val">three · r3f</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-idx">{String(activeIdx + 1).padStart(2, '0')} /</span>
            <span className="topbar-filename">{activeName}</span>
            <div className="tags">
              {activeTags.map(tag => {
                const m = TAG_META[tag] || { color: '#aaa' }
                return <span key={tag} className="tag" style={{ color: m.color, borderColor: m.color + '40' }}>{tag}</span>
              })}
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-path">{activeFile}</span>
            <span className="topbar-divider">·</span>
            <span className="topbar-stat">{activeLines}L</span>
            <span className="topbar-divider">·</span>
            <span className="topbar-stat">{activeBytes}</span>
          </div>
        </div>

        <div className="desc-bar">
          <span className="desc-arrow">▸</span>
          <span style={{ flex: 1 }}>{activeDescription}</span>
          <div className="desc-settings">
            <span className="desc-settings-label">DPR</span>
            {[0.5, 1, 1.5, 2, window.devicePixelRatio]
              .filter((v, i, a) => a.indexOf(v) === i)
              .sort((a, b) => a - b)
              .map(v => (
                <button
                  key={v}
                  className={'psetting-btn' + (dpr === v ? ' active' : '')}
                  onClick={() => handleDprChange(v)}
                >
                  {v === window.devicePixelRatio && v !== 0.5 && v !== 1 && v !== 1.5 && v !== 2 ? 'native' : `${v}x`}
                </button>
              ))}
          </div>
        </div>

        <div className="preview-pane" ref={previewRef}>
          <div className="preview-corner tl">PREVIEW</div>
          <div className="preview-corner tr">{isCustom ? 'CUSTOM' : activeKey.toUpperCase()}</div>
          {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <div
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
              style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '.08em', cursor: 'pointer', userSelect: 'none' }}
              title="Click to reset view"
            >
              {Math.round(zoom * 100)}% · [RESET]
            </div>
          )}
          {ctrlHeld && <div style={{ position: 'absolute', inset: 0, zIndex: 20, cursor: 'zoom-in' }} />}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', transformOrigin: 'center', transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`, willChange: 'transform' }}>
              <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <PreviewPane isCustom={isCustom} activeKey={activeKey} customSnippet={customSnippet} dpr={dpr} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
