'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { 
  Bot, 
  Play, 
  Sparkles, 
  Hammer, 
  FileCheck2, 
  ScrollText, 
  FileBox, 
  CheckCircle2,
  Zap,
  Clock,
  Activity
} from 'lucide-react'

type ProcessNode = {
  id: string
  label: string
  icon: JSX.Element
  status: 'pending' | 'active' | 'complete' | 'error'
  startTime?: number
  endTime?: number
  details?: string
}

export default function AdminAIPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('Generate an easy forensic challenge. Hide the flag in HTML comments of a static page.')
  const [track, setTrack] = useState<'INTEL_RECON' | 'ACCESS_EXPLOIT' | 'IDENTITY_CLOUD' | 'C2_EGRESS' | 'DETECT_FORENSICS'>('DETECT_FORENSICS')
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'INSANE'>('EASY')
  const [provider, setProvider] = useState<'auto' | 'gpt5' | 'claude'>('auto')
  const [maxIterations, setMaxIterations] = useState<number>(20)
  const [seed, setSeed] = useState<number | undefined>(undefined)
  
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [visualOnly, setVisualOnly] = useState(true)
  const [phase, setPhase] = useState<string | null>(null)
  const [cinematic, setCinematic] = useState(false)
  const [hudMessage, setHudMessage] = useState('')
  const [hudTypedText, setHudTypedText] = useState('')
  const typingTimerRef = useRef<number | null>(null)
  const [iterationCurrent, setIterationCurrent] = useState<number | null>(null)
  const [iterationMax, setIterationMax] = useState<number | null>(null)
  const [toolName, setToolName] = useState<string | null>(null)
  const [toolSuccess, setToolSuccess] = useState<boolean | null>(null)
  const [startTs, setStartTs] = useState<number | null>(null)
  const [clockTick, setClockTick] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const logRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; hue: number }>>([])
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const burstsRef = useRef<Array<{ nodeIndex: number; hue: number; startedAt: number; duration: number }>>([])
  const packetsRef = useRef<Array<{ startedAt: number; duration: number }>>([])

  const pushBurst = (nodeIndex: number, hue: number = 160, duration: number = 800) => {
    if (nodeIndex < 0) return
    burstsRef.current.push({ nodeIndex, hue, startedAt: Date.now(), duration })
    // prevent unbounded growth
    if (burstsRef.current.length > 64) burstsRef.current.splice(0, burstsRef.current.length - 64)
  }

  const spawnPackets = (count: number = 8) => {
    for (let i = 0; i < count; i++) {
      packetsRef.current.push({ startedAt: Date.now() + Math.random() * 300, duration: 1200 + Math.random() * 1000 })
    }
    if (packetsRef.current.length > 120) packetsRef.current.splice(0, packetsRef.current.length - 120)
  }

  // Tool showcase panel state
  type ToolShowcase = {
    name: string
    kind: 'write' | 'execute' | 'generic'
    args?: any
    content?: string
    path?: string
    command?: string
    stdout?: string
    stderr?: string
    success?: boolean | null
  }
  const [toolShowcase, setToolShowcase] = useState<ToolShowcase | null>(null)
  const currentToolNameRef = useRef<string | null>(null)
  const minShowMs = 2800
  const lastShowStartRef = useRef<number>(0)
  const pendingShowRef = useRef<ToolShowcase | null>(null)
  const showTimerRef = useRef<number | null>(null)

  const scheduleShowcase = (sc: ToolShowcase) => {
    if (!toolShowcase) {
      setToolShowcase(sc)
      lastShowStartRef.current = Date.now()
    } else {
      const elapsed = Date.now() - lastShowStartRef.current
      const remaining = Math.max(0, minShowMs - elapsed)
      pendingShowRef.current = sc
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current)
      showTimerRef.current = window.setTimeout(() => {
        setToolShowcase(pendingShowRef.current)
        lastShowStartRef.current = Date.now()
        pendingShowRef.current = null
      }, remaining)
    }
  }

  const getToolKind = (name?: string, args?: any): 'write' | 'execute' | 'generic' => {
    const n = (name || '').toLowerCase()
    const hasContent = args && (args.content || args.text || args.data)
    if (n.includes('write') || n.includes('file') || hasContent) return 'write'
    if (n.includes('exec') || n.includes('run') || n.includes('shell') || n.includes('command')) return 'execute'
    return 'generic'
  }
  
  const [nodes, setNodes] = useState<ProcessNode[]>([
    { id: 'init', label: 'Initialize Agent', icon: <Bot className="w-5 h-5" />, status: 'pending' },
    { id: 'plan', label: 'Generate Plan', icon: <Sparkles className="w-5 h-5" />, status: 'pending' },
    { id: 'build', label: 'Build Challenge', icon: <Hammer className="w-5 h-5" />, status: 'pending' },
    { id: 'verify', label: 'Verify Solution', icon: <FileCheck2 className="w-5 h-5" />, status: 'pending' },
    { id: 'extract', label: 'Extract Metadata', icon: <ScrollText className="w-5 h-5" />, status: 'pending' },
    { id: 'materialize', label: 'Materialize Assets', icon: <FileBox className="w-5 h-5" />, status: 'pending' },
    { id: 'complete', label: 'Complete', icon: <CheckCircle2 className="w-5 h-5" />, status: 'pending' }
  ])

  const updateNode = (nodeId: string, updates: Partial<ProcessNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, ...updates, ...(updates.status === 'active' && !node.startTime ? { startTime: Date.now() } : {}), ...(updates.status === 'complete' && !node.endTime ? { endTime: Date.now() } : {}) }
        : node
    ))
  }

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    if (visualOnly) return
    const timestamp = new Date().toLocaleTimeString()
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
    setLogs(prev => [...prev, `${timestamp} ${emoji} ${message}`])
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight
      }
    }, 100)
  }

  // Sebastian Lague-style canvas animation
  const drawVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Cinematic subtle vignette background
    const bgGradient = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.1, width * 0.5, height * 0.5, Math.max(width, height) * 0.8)
    bgGradient.addColorStop(0, 'rgba(10, 12, 16, 1)')
    bgGradient.addColorStop(1, 'rgba(6, 8, 12, 1)')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Cinematic micro pan/zoom
    const zoom = (isRunning || cinematic) ? 1 + 0.02 * Math.sin(Date.now() * 0.0002) : 1
    ctx.save()
    if (zoom !== 1) {
      ctx.translate(width / 2, height / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-width / 2, -height / 2)
    }

    // Draw background grid (Sebastian Lague style)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)'
    ctx.lineWidth = 1
    const gridSize = 20
    // Particles for ambient motion
    const desiredCount = Math.min(160, Math.floor((width * height) / 15000))
    if (lastSizeRef.current.w !== width || lastSizeRef.current.h !== height) {
      particlesRef.current = []
      lastSizeRef.current = { w: width, h: height }
    }
    while (particlesRef.current.length < desiredCount) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3,
        hue: 190 + Math.random() * 30,
      })
    }
    if (particlesRef.current.length > desiredCount) particlesRef.current.length = desiredCount
    particlesRef.current.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = width
      if (p.x > width) p.x = 0
      if (p.y < 0) p.y = height
      if (p.y > height) p.y = 0

      ctx.beginPath()
      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, 0.6)`
      ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, 0.8)`
      ctx.shadowBlur = 8
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Calculate node positions
    const nodeRadius = 25
    const nodeSpacing = (width - 100) / (nodes.length - 1)
    const nodeY = height / 2

    // Draw connections between nodes (curved + animated when complete)
    for (let i = 0; i < nodes.length - 1; i++) {
      const x1 = 50 + i * nodeSpacing
      const x2 = 50 + (i + 1) * nodeSpacing
      const currentNode = nodes[i]
      const isComplete = currentNode.status === 'complete'

      const cx = (x1 + x2) / 2
      const cy = nodeY + ((i % 2 === 0) ? -40 : 40)

      const time = Date.now() * 0.003
      const gradient = ctx.createLinearGradient(x1, nodeY, x2, nodeY)
      if (isComplete) {
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.3)')
        gradient.addColorStop(0.5 + Math.sin(time) * 0.3, 'rgba(56, 189, 248, 0.9)')
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.3)')
      } else {
        gradient.addColorStop(0, 'rgba(148, 163, 184, 0.15)')
        gradient.addColorStop(1, 'rgba(148, 163, 184, 0.15)')
      }
      ctx.strokeStyle = gradient
      ctx.lineWidth = isComplete ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(x1 + nodeRadius, nodeY)
      ctx.quadraticCurveTo(cx, cy, x2 - nodeRadius, nodeY)
      ctx.stroke()
    }

    // Active link packets (flowing dots)
    const activeIndex = nodes.findIndex(n => n.status === 'active')
    if (activeIndex >= 0 && activeIndex < nodes.length - 1) {
      const x1 = 50 + activeIndex * nodeSpacing
      const x2 = 50 + (activeIndex + 1) * nodeSpacing
      const cx = (x1 + x2) / 2
      const cy = nodeY + ((activeIndex % 2 === 0) ? -40 : 40)

      const pointAt = (t: number) => {
        const ax = x1 + nodeRadius
        const ay = nodeY
        const bx = cx
        const by = cy
        const cx2 = x2 - nodeRadius
        const cy2 = nodeY
        const u = 1 - t
        const px = u * u * ax + 2 * u * t * bx + t * t * cx2
        const py = u * u * ay + 2 * u * t * by + t * t * cy2
        return { px, py }
      }

      const now = Date.now()
      packetsRef.current = packetsRef.current.filter(p => now - p.startedAt <= p.duration)
      packetsRef.current.forEach(p => {
        const t = Math.max(0, Math.min(1, (now - p.startedAt) / p.duration))
        const { px, py } = pointAt(t)
        ctx.beginPath()
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)'
        ctx.shadowColor = 'rgba(56, 189, 248, 0.9)'
        ctx.shadowBlur = 10
        ctx.arc(px, py, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })
    }

    // Draw nodes
    nodes.forEach((node, index) => {
      const x = 50 + index * nodeSpacing
      const y = nodeY

      // Node background
      ctx.beginPath()
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2)
      
      // Color based on status
      switch (node.status) {
        case 'complete':
          ctx.fillStyle = 'rgba(34, 197, 94, 0.18)'
          ctx.strokeStyle = 'rgb(34, 197, 94)'
          break
        case 'active':
          // Pulsing effect
          const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7
          ctx.fillStyle = `rgba(56, 189, 248, ${pulse * 0.3})`
          ctx.strokeStyle = `rgb(56, 189, 248)`
          break
        case 'error':
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
          ctx.strokeStyle = 'rgb(239, 68, 68)'
          break
        default:
          ctx.fillStyle = 'rgba(148, 163, 184, 0.1)'
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
      }
      
      ctx.lineWidth = 3
      // glow
      ctx.save()
      ctx.shadowColor = node.status === 'active' ? 'rgba(56, 189, 248, 0.7)' : node.status === 'complete' ? 'rgba(34, 197, 94, 0.5)' : 'transparent'
      ctx.shadowBlur = node.status === 'active' ? 20 : node.status === 'complete' ? 12 : 0
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // Node label
      ctx.fillStyle = node.status === 'complete' ? 'rgb(34, 197, 94)' : node.status === 'active' ? 'rgb(56, 189, 248)' : 'rgb(148, 163, 184)'
      ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, x, y + nodeRadius + 20)

      // Duration for completed nodes
      if (node.status === 'complete' && node.startTime && node.endTime) {
        const duration = ((node.endTime - node.startTime) / 1000).toFixed(1)
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'
        ctx.font = '10px Inter, sans-serif'
        ctx.fillText(`${duration}s`, x, y + nodeRadius + 35)
      }

      // Active indicator
      if (node.status === 'active') {
        const time = Date.now() * 0.01
        ctx.beginPath()
        ctx.arc(x, y, nodeRadius + 5 + Math.sin(time) * 3, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    ctx.restore()

    // Draw bursts for completed steps
    const now = Date.now()
    burstsRef.current = burstsRef.current.filter(b => now - b.startedAt <= b.duration)
    burstsRef.current.forEach(b => {
      const i = b.nodeIndex
      if (i < 0 || i >= nodes.length) return
      const x = 50 + i * nodeSpacing
      const y = nodeY
      const t = (now - b.startedAt) / b.duration
      const radius = 12 + t * 40
      const alpha = 1 - t
      // outer ring
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${b.hue}, 100%, 60%, ${alpha * 0.8})`
      ctx.lineWidth = 2
      ctx.stroke()
      // shimmering spokes
      const spokeCount = 8
      for (let s = 0; s < spokeCount; s++) {
        const angle = (Math.PI * 2 * s) / spokeCount + now * 0.002
        const sx = x + Math.cos(angle) * (radius - 6)
        const sy = y + Math.sin(angle) * (radius - 6)
        const ex = x + Math.cos(angle) * (radius + 6)
        const ey = y + Math.sin(angle) * (radius + 6)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.strokeStyle = `hsla(${b.hue}, 100%, 70%, ${alpha * 0.6})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    })
  }

  const animate = () => {
    drawVisualization()
    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    animate()
    const onResize = () => drawVisualization()
    window.addEventListener('resize', onResize)
    const tick = window.setInterval(() => setClockTick((t) => t + 1), 500)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', onResize)
      window.clearInterval(tick)
    }
  }, [nodes])

  // Typewriter effect for HUD narration
  useEffect(() => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (!hudMessage) {
      setHudTypedText('')
      return
    }
    setHudTypedText('')
    let index = 0
    typingTimerRef.current = window.setInterval(() => {
      index += 1
      setHudTypedText(hudMessage.slice(0, index))
      if (index >= hudMessage.length && typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }, 18)
    return () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }
  }, [hudMessage])

  const startGeneration = async () => {
    console.log('=== STARTING GENERATION ===')
    console.log('Current state:', { isRunning, prompt, track, difficulty, provider, maxIterations, seed })
    
    setIsRunning(true)
    setCinematic(true)
    setVisualOnly(true)
    setHudMessage('Initializing AI Orchestrator...')
    setHudTypedText('')
    setIterationCurrent(null)
    setIterationMax(null)
    setToolName(null)
    setToolSuccess(null)
    setStartTs(Date.now())
    setLogs([])
    setResult(null)
    
    // Reset all nodes
    setNodes(prev => prev.map(node => ({ 
      ...node, 
      status: 'pending' as const, 
      startTime: undefined, 
      endTime: undefined 
    })))

    try {
      const token = apiClient.getToken()
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = `${baseUrl}/api/admin/ai/generate`
      
      console.log('Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')
      console.log('URL:', url)
      
      addLog('🚀 Connecting to generation stream...', 'info')
      addLog(`📍 URL: ${url}`, 'info')
      addLog(`🔑 Token: ${token ? 'Present' : 'Missing'}`, token ? 'info' : 'warning')
      
      // Create JSON payload for POST request
      const requestBody = {
        prompt,
        track,
        difficulty,
        preferred_provider: provider,
        max_iterations: maxIterations,
        ...(seed && { seed })
      }
      
      console.log('Request body:', requestBody)
      addLog(`📤 Request: ${JSON.stringify(requestBody, null, 2)}`, 'info')
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      }
      
      console.log('Request headers:', headers)
      addLog(`📋 Headers: Content-Type=application/json, Accept=text/event-stream`, 'info')
      
      // Use fetch for streaming POST request
      addLog('🌐 Making POST request...', 'info')
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status, response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      addLog(`📨 Response: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error')
      addLog(`📋 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`, 'info')

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response body:', errorText)
        addLog(`❌ Error body: ${errorText}`, 'error')
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      const contentType = response.headers.get('content-type')
      console.log('Content-Type:', contentType)
      addLog(`📝 Content-Type: ${contentType}`, 'info')

      if (!contentType?.includes('text/event-stream')) {
        addLog('⚠️ Warning: Expected text/event-stream content type', 'warning')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      addLog('📖 Starting to read stream...', 'info')
      const decoder = new TextDecoder()
      let buffer = ''
      let eventCount = 0

      while (true) {
        console.log('Reading next chunk...')
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('Stream completed')
          addLog(`✅ Stream completed (${eventCount} events received)`, 'success')
          setIsRunning(false)
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue
          // Ignore comment/heartbeat lines
          if (line.startsWith(':')) continue

          if (line.startsWith('data: ')) {
            eventCount++
            const dataStr = line.slice(6)
            
            try {
              const data = JSON.parse(dataStr)
              // Minimal event log
              addLog(`🎯 ${data.type}${data.message ? ` - ${data.message}` : ''}`, 'success')
              
              // Update UI based on event type
              switch (data.type) {
                case 'init':
                  updateNode('init', { status: 'active', details: data.message })
                  setPhase('init')
                  setHudMessage(data.message || 'Initializing...')
                  addLog(`🤖 ${data.message}`, 'info')
                  break
                case 'plan':
                  updateNode('init', { status: 'complete' })
                  updateNode('plan', { status: 'active', details: data.message })
                  setPhase('plan')
                  setHudMessage(data.message || 'Generating plan...')
                  pushBurst(1, 200)
                  addLog(`✨ ${data.message}`, 'info')
                  break
                case 'build':
                  updateNode('plan', { status: 'complete' })
                  updateNode('build', { status: 'active', details: data.message })
                  setPhase('build')
                  setHudMessage(data.message || 'Building challenge...')
                  pushBurst(2, 190)
                  addLog(`🔨 ${data.message}`, 'info')
                  break
                case 'iteration':
                  setPhase('iteration')
                  setIterationCurrent(data.current)
                  setIterationMax(data.max)
                  setHudMessage(`Iteration ${data.current}/${data.max}`)
                  spawnPackets(8)
                  addLog(`🔄 Iteration ${data.current}/${data.max}`, 'info')
                  break
                case 'agent_message':
                  setHudMessage('Agent responded')
                  addLog(`🧠 Agent response (${data.tool_calls} tools)`, 'info')
                  break
                case 'tool_call':
                  setPhase('tool')
                  setToolName(data.name)
                  setToolSuccess(null)
                  setHudMessage(`Executing tool: ${data.name}`)
                  // Placeholder showcase without args (will be updated on tool_args)
                  scheduleShowcase({ name: data.name, kind: getToolKind(data.name), success: null })
                  addLog(`🔧 Executing tool: ${data.name}`, 'info')
                  break
                case 'tool_args':
                  // Update showcase with arguments (may include content for write_file/read_file)
                  scheduleShowcase({
                    name: data.name,
                    kind: getToolKind(data.name, data.args),
                    args: data.args,
                    content: data.args?.content || data.args?.text || data.args?.data,
                    path: data.args?.path,
                    command: data.args?.command || data.args?.cmd,
                    success: null
                  })
                  break
                case 'tool_result':
                  const status = data.success ? '✅' : '❌'
                  addLog(`${status} Tool ${data.name}: ${data.success ? 'success' : 'failed'}`, data.success ? 'success' : 'error')
                  if (data.stdout) addLog(`📤 ${data.stdout}`, 'info')
                  if (data.stderr) addLog(`📤 ${data.stderr}`, 'warning')
                  setToolName(data.name)
                  setToolSuccess(!!data.success)
                  setHudMessage(`Tool ${data.name} ${data.success ? 'succeeded' : 'failed'}`)
                  // Update showcase with results
                  scheduleShowcase({
                    name: data.name,
                    kind: getToolKind(data.name, data.args),
                    args: data.args,
                    path: data.args?.path,
                    content: data.content || data.args?.content, // prefer returned content (read_file)
                    stdout: data.stdout,
                    stderr: data.stderr,
                    success: !!data.success
                  })
                  break
                case 'verify':
                  updateNode('build', { status: 'complete' })
                  updateNode('verify', { status: 'active', details: data.message })
                  setPhase('verify')
                  setHudMessage(data.message || 'Verifying solution...')
                  pushBurst(3, 120)
                  addLog(`🧪 ${data.message}`, 'info')
                  break
                case 'extract':
                  updateNode('verify', { status: 'complete' })
                  updateNode('extract', { status: 'active', details: data.message })
                  setPhase('extract')
                  setHudMessage(data.message || 'Extracting metadata...')
                  pushBurst(4, 160)
                  addLog(`📋 ${data.message}`, 'info')
                  break
                case 'materialize':
                  updateNode('extract', { status: 'complete' })
                  updateNode('materialize', { status: 'active', details: data.message })
                  setPhase('materialize')
                  setHudMessage(data.message || 'Materializing assets...')
                  pushBurst(5, 140)
                  addLog(`💾 ${data.message}`, 'info')
                  break
                case 'complete':
                  updateNode('materialize', { status: 'complete' })
                  updateNode('complete', { status: 'complete' })
                  setResult(data)
                  setPhase('complete')
                  setHudMessage(`Challenge ${data.challenge_id?.substring(0, 8)} completed!`)
                  pushBurst(6, 120, 1200)
                  addLog(`🎉 Challenge ${data.challenge_id?.substring(0, 8)} completed!`, 'success')
                  setIsRunning(false)
                  // Showcase final result card
                  scheduleShowcase({
                    name: 'Result',
                    kind: 'generic',
                    args: { challenge_id: data.challenge_id, provider: data.provider }
                  })
                  break
                case 'error':
                  addLog(`❌ Error: ${data.message}`, 'error')
                  setHudMessage(`Error: ${data.message}`)
                  setIsRunning(false)
                  break
                default:
                  // ignore unknown events quietly
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', line, e)
              addLog(`❌ Parse error`, 'error')
            }
          } else {
            // Ignore non-data lines
          }
        }
      }
      
    } catch (error) {
      console.error('Generation failed:', error)
      addLog(`❌ Connection failed: ${error}`, 'error')
      addLog(`🔍 Error details: ${JSON.stringify(error)}`, 'error')
      setIsRunning(false)
    }
  }

  const completedSteps = nodes.filter(n => n.status === 'complete').length
  const totalSteps = nodes.length
  const progressPercent = (completedSteps / totalSteps) * 100

  return (
    <div className={"space-y-8 " + ((isRunning || cinematic) ? 'p-0' : 'py-8 px-24')}>
      {!(isRunning || cinematic) && (
        <div className="flex items-center justify-between px-24">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8 text-brand" />
              AI Challenge Generator
            </h1>
            <p className="text-muted-foreground">
              Generate CTF challenges using AI with real-time process visualization
            </p>
          </div>
        </div>
      )}

      {!(isRunning || cinematic) && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generation Settings</CardTitle>
          <CardDescription>
            Configure your challenge parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isRunning}
                className="resize-y min-h-[48px] h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Track</label>
              <Select value={track} onValueChange={(v: any) => setTrack(v)} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTEL_RECON">Intel & Recon</SelectItem>
                  <SelectItem value="ACCESS_EXPLOIT">Access & Exploit</SelectItem>
                  <SelectItem value="IDENTITY_CLOUD">Identity & Cloud</SelectItem>
                  <SelectItem value="C2_EGRESS">C2 & Egress</SelectItem>
                  <SelectItem value="DETECT_FORENSICS">Detect & Forensics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                  <SelectItem value="INSANE">Insane</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={provider} onValueChange={(v: any) => setProvider(v)} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="gpt5">GPT-5</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Iterations</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value || 1))}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seed (Optional)</label>
              <Input
                type="number"
                value={seed ?? ''}
                onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
                disabled={isRunning}
              />
            </div>
          </div>

          

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button onClick={startGeneration} disabled={isRunning} size="lg">
                {isRunning ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Generation
                  </>
                )}
              </Button>
              {isRunning && (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-muted-foreground">Progress:</div>
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium">{Math.round(progressPercent)}%</div>
                </div>
              )}
            </div>

            {result && (
              <div className="flex items-center space-x-2">
                <Badge variant="default">Challenge ID: {result.challenge_id?.substring(0, 8)}</Badge>
                <Badge variant="outline">{result.provider}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      <Card className={(isRunning || cinematic) ? 'mx-auto w-full max-w-[1440px] border-0 bg-transparent' : 'mx-auto w-full max-w-[1440px]'}>
        <CardHeader>
          {!(isRunning || cinematic) && (
            <>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand" />
                Process Visualization
              </CardTitle>
              <CardDescription>
                Real-time visualization of the AI generation pipeline
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <div className={"relative flex items-center justify-center " + ((isRunning || cinematic) ? 'h-[calc(100vh-140px)]' : '')}>
            <div className="relative mx-auto max-w-[1280px] h-full w-full">
            
            <canvas
              ref={canvasRef}
              className={"w-full border border-border rounded-2xl bg-gradient-to-br from-background to-secondary/5 gradient-smooth " + ((isRunning || cinematic) ? 'h-full' : 'h-48')}
              style={{ imageRendering: 'crisp-edges' }}
            />
            {(isRunning || cinematic) && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-terminal-scanlines bg-scanlines opacity-10 rounded-2xl" />
                <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.65), inset 0 -80px 160px rgba(0,0,0,0.35)' }} />
                <div className="absolute top-4 left-4 bg-background/70 backdrop-blur border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium">AI Challenge Generator</span>
                </div>
                {/* Centered Overlay for Code/Execution */}
                <AnimatePresence>
                  {toolShowcase && (
                    <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50" />
                      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} className="relative w-[min(90vw,1000px)] max-h-[80vh] rounded-2xl border border-border bg-background/90 backdrop-blur shadow-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">{toolShowcase.kind === 'write' ? 'Write' : toolShowcase.kind === 'execute' ? 'Execute' : 'Tool'}</div>
                          <div className="text-xs font-medium truncate">{toolShowcase.name}</div>
                          <div className={"ml-auto text-xs px-2 py-0.5 rounded-full " + (toolShowcase.success == null ? 'bg-muted/50' : toolShowcase.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30')}>
                            {toolShowcase.success == null ? 'Running' : toolShowcase.success ? 'Success' : 'Failed'}
                          </div>
                        </div>
                        <div className="p-4 overflow-auto max-h-[calc(80vh-56px)]">
                          {toolShowcase.kind === 'write' && (
                            <div className="space-y-3">
                              {toolShowcase.path && <div className="text-xs text-muted-foreground">{toolShowcase.path}</div>}
                              <div className="prose prose-invert max-w-none rounded-lg border border-border bg-background/60 p-3">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({ node, className, children, ...props }) {
                                      const match = /language-(\w+)/.exec(className || '')
                                      const codeText = String(children).replace(/\n$/, '')
                                      if (className && className.includes('language-')) {
                                        return (
                                          <SyntaxHighlighter style={oneDark} language={(match && match[1]) || 'python'} PreTag="div">
                                            {codeText}
                                          </SyntaxHighlighter>
                                        )
                                      }
                                      return <code className={className} {...props}>{children as any}</code>
                                    }
                                  }}
                                >
                                  {toolShowcase.content || '[no content provided]'}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {toolShowcase.kind === 'execute' && (
                            <div className="space-y-3">
                              {toolShowcase.command && <div className="text-xs text-muted-foreground">$ {toolShowcase.command}</div>}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <pre className="code-font text-xs whitespace-pre-wrap break-words rounded-lg border border-border bg-background/60 p-3"><span className="text-muted-foreground">stdout</span>\n{toolShowcase.stdout || ''}</pre>
                                <pre className="code-font text-xs whitespace-pre-wrap break-words rounded-lg border border-border bg-background/60 p-3"><span className="text-muted-foreground">stderr</span>\n{toolShowcase.stderr || ''}</pre>
                              </div>
                            </div>
                          )}
                          {toolShowcase.kind === 'generic' && (
                            <pre className="code-font text-xs whitespace-pre-wrap break-words rounded-lg border border-border bg-background/60 p-3">{JSON.stringify({ args: toolShowcase.args, stdout: toolShowcase.stdout, stderr: toolShowcase.stderr }, null, 2)}</pre>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background/80">
                          <Button variant="outline" onClick={() => setToolShowcase(null)}>Close</Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            {/* Removed overlapping active-node card (phase header already indicates state) */}
            {(isRunning || cinematic) && (
              <>
                {/* Progress dots removed to avoid background overlap under the status bar */}
                {/* Left step rail removed per request to reduce clutter */}
                {/* Top-center phase header */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-2 rounded-full border border-border bg-background/80 backdrop-blur text-sm font-medium shadow-sm">
                    {phase ? phase.replace('_', ' ').toUpperCase() : 'READY'}
                  </div>
                </div>
                {/* Right metrics panel - prevent overlap with phase header (nudge down) */}
                <div className="absolute top-20 right-8 w-72 space-y-3">
                  <motion.div layout className="rounded-xl border border-border/60 bg-background/60 backdrop-blur p-3 shadow-sm">
                    <div className="text-xs text-muted-foreground">Iterations</div>
                    <div className="text-sm font-medium">{iterationCurrent ?? 0} / {iterationMax ?? maxIterations}</div>
                  </motion.div>
                  <motion.div layout className="rounded-xl border border-border/60 bg-background/60 backdrop-blur p-3 shadow-sm">
                    <div className="text-xs text-muted-foreground">Elapsed</div>
                    <div className="text-sm font-medium">{startTs ? (((Date.now() - startTs) / 1000) | 0) + 's' : '0s'}</div>
                  </motion.div>
                  <motion.div layout className="rounded-xl border border-border/60 bg-background/60 backdrop-blur p-3 shadow-sm">
                    <div className="text-xs text-muted-foreground">Context</div>
                    <div className="text-sm font-medium truncate">{provider} • {difficulty}</div>
                  </motion.div>
                  <motion.div layout className={("rounded-xl border p-3 backdrop-blur shadow-sm ") + (toolSuccess == null ? 'border-border/60 bg-background/60' : toolSuccess ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10')}>
                    <div className="text-xs text-muted-foreground">Tool</div>
                    <div className="text-sm font-medium truncate">{toolName ?? '—'}</div>
                  </motion.div>
                </div>
                {/* Bottom live status and final actions (hidden when overlay is open) */}
                {!toolShowcase && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full px-6">
                  <div className="mx-auto max-w-3xl px-4 py-2 rounded-full border border-border bg-background/90 backdrop-blur flex items-center gap-4 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    <div className="text-sm text-foreground/90 truncate">{hudMessage}</div>
                    <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><span className="text-foreground/70">Phase:</span><span className="font-medium">{phase ?? '—'}</span></div>
                      <div className="flex items-center gap-1"><span className="text-foreground/70">Iter:</span><span className="font-medium">{iterationCurrent ?? 0}/{iterationMax ?? maxIterations}</span></div>
                      <div className="flex items-center gap-1"><span className="text-foreground/70">Tool:</span><span className="font-medium">{toolName ?? '—'}</span></div>
                    </div>
                    {phase === 'complete' && result?.challenge_id && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="default" onClick={() => router.push(`/admin/challenges/${result.challenge_id}`)}>See Challenge</Button>
                        <Button variant="outline" onClick={() => { setCinematic(false); setIsRunning(false); }}>Create Another</Button>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!visualOnly && (
      <Card className={(isRunning || cinematic) ? 'rounded-none border-t-0' : ''}>
        <CardHeader>
          {!(isRunning || cinematic) && (
            <>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand" />
                Live Output
              </CardTitle>
              <CardDescription>
                Real-time logs and status updates
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <div 
            ref={logRef}
            className={((isRunning || cinematic) ? 'h-[40vh]' : 'h-64') + " bg-secondary/10 rounded-lg p-4 font-mono text-sm overflow-y-auto border border-border"}
          >
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">Ready to start generation...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-foreground">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}