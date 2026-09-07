import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SEG } from '../gameSync.js'

const N = SEG.length
const SEG_ANGLE_DEG = 360 / N
const SEG_ANGLE_RAD = (2 * Math.PI) / N

export default function ThreeDWheel({
  isSpinning,
  targetSegIndex,
  currentRotationDeg,
  onSelectSegment,
  myBets = {},
  activeWinSeg,
  spinDurationMs = 4200,
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const wheelGroupRef = useRef(null)
  const pointerMeshRef = useRef(null)
  const animFrameRef = useRef(null)
  const textureCanvasRef = useRef(null)
  const wheelTextureRef = useRef(null)
  const sparkParticlesRef = useRef(null)
  const [hoveredSeg, setHoveredSeg] = useState(null)

  // ── 1. Doku (Texture) Çizimi Canvas ──
  const drawWheelTexture = () => {
    let canvas = textureCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      textureCanvasRef.current = canvas
    }
    const ctx = canvas.getContext('2d')
    const size = 1024
    const center = size / 2
    const radius = size * 0.48

    ctx.clearRect(0, 0, size, size)

    // Dış Halka Altın Metalik Çerçeve
    const outerGrad = ctx.createRadialGradient(center, center, radius * 0.94, center, center, radius)
    outerGrad.addColorStop(0, '#ffd700')
    outerGrad.addColorStop(0.5, '#b8860b')
    outerGrad.addColorStop(1, '#664d03')
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.fillStyle = outerGrad
    ctx.fill()

    // Dilimleri Çiz
    for (let i = 0; i < N; i++) {
      const seg = SEG[i]
      const startAngle = i * SEG_ANGLE_RAD - Math.PI / 2
      const endAngle = (i + 1) * SEG_ANGLE_RAD - Math.PI / 2

      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius * 0.94, startAngle, endAngle)
      ctx.closePath()

      // Gradient dolgu
      const grad = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius * 0.94)
      grad.addColorStop(0, '#10141c')
      grad.addColorStop(0.35, seg.c)
      grad.addColorStop(1, '#05070a')
      ctx.fillStyle = grad
      ctx.fill()

      // Kenar Çizgisi
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.stroke()

      // Dilim Yazısı
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(startAngle + SEG_ANGLE_RAD / 2 + Math.PI / 2)

      // Gölge
      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(seg.l, 0, -radius * 0.65)

      // Bahis Miktarı (varsa)
      const betAmt = myBets[i]
      if (betAmt) {
        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 28px monospace'
        ctx.fillText(`💰${betAmt}`, 0, -radius * 0.44)
      }

      ctx.restore()
    }

    // Dilim Sınırlarına Altın Çiviler (Studs/Pegs)
    for (let i = 0; i < N; i++) {
      const angle = i * SEG_ANGLE_RAD - Math.PI / 2
      const pegX = center + (radius * 0.95) * Math.cos(angle)
      const pegY = center + (radius * 0.95) * Math.sin(angle)

      ctx.beginPath()
      ctx.arc(pegX, pegY, 9, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 12
      ctx.fill()
      ctx.strokeStyle = '#d4af37'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // Merkez Göbek Yuvası
    const hubGrad = ctx.createRadialGradient(center, center, 0, center, center, radius * 0.26)
    hubGrad.addColorStop(0, '#334155')
    hubGrad.addColorStop(0.7, '#0f172a')
    hubGrad.addColorStop(1, '#ffd700')
    ctx.beginPath()
    ctx.arc(center, center, radius * 0.26, 0, Math.PI * 2)
    ctx.fillStyle = hubGrad
    ctx.fill()
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 6
    ctx.stroke()

    return canvas
  }

  // ── 2. Three.js Sahnesi Kurulumu ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 360
    const height = container.clientHeight || 360

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera (Isometric eğimli perspektif)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, -0.6, 5.2)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer (Hafifletilmiş yüksek performanslı WebGL)
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1)
    scene.add(ambientLight)

    const dirGold = new THREE.DirectionalLight(0xffd700, 2.0)
    dirGold.position.set(2, 4, 5)
    scene.add(dirGold)

    const rimLight = new THREE.PointLight(0x00e575, 1.8, 8)
    rimLight.position.set(-3, -2, 2)
    scene.add(rimLight)

    // Wheel 3D Group
    const wheelGroup = new THREE.Group()
    scene.add(wheelGroup)
    wheelGroupRef.current = wheelGroup

    // Canvas Texture
    const canvas = drawWheelTexture()
    const texture = new THREE.CanvasTexture(canvas)
    wheelTextureRef.current = texture

    // 3D Cylinder Geometry (Optimize edilmiş 32 segment)
    const wheelGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.2, 32)
    const wheelMat = new THREE.MeshLambertMaterial({
      map: texture,
    })
    const wheelSideMat = new THREE.MeshLambertMaterial({
      color: 0x1a202c,
    })
    const wheelMesh = new THREE.Mesh(wheelGeo, [wheelSideMat, wheelMat, wheelSideMat])
    wheelMesh.rotation.x = Math.PI / 2
    wheelGroup.add(wheelMesh)

    // Dış Altın Halka
    const rimTorusGeo = new THREE.TorusGeometry(2.02, 0.05, 12, 32)
    const rimMat = new THREE.MeshLambertMaterial({
      color: 0xffd700,
    })
    const rimMesh = new THREE.Mesh(rimTorusGeo, rimMat)
    wheelGroup.add(rimMesh)

    // Merkez 3D Krom Kubbe
    const hubGeo = new THREE.SphereGeometry(0.48, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const hubMat = new THREE.MeshLambertMaterial({
      color: 0xffd700,
    })
    const hubMesh = new THREE.Mesh(hubGeo, hubMat)
    hubMesh.rotation.x = Math.PI / 2
    hubMesh.position.z = 0.12
    wheelGroup.add(hubMesh)

    // 3D Pointer Pin (Tepede duran fiziksel iğne)
    const pointerGroup = new THREE.Group()
    pointerGroup.position.set(0, 2.05, 0.25)
    scene.add(pointerGroup)

    const pointerGeo = new THREE.ConeGeometry(0.16, 0.5, 12)
    const pointerMat = new THREE.MeshLambertMaterial({
      color: 0xff3b30,
    })
    const pointerMesh = new THREE.Mesh(pointerGeo, pointerMat)
    pointerMesh.rotation.z = Math.PI
    pointerMesh.position.y = -0.2
    pointerGroup.add(pointerMesh)
    pointerMeshRef.current = pointerGroup

    // Kıvılcım / Parçacık Halkası (Spark Ring)
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const r = 2.05 + (Math.random() - 0.5) * 0.15
      particlePositions[i * 3] = Math.cos(angle) * r
      particlePositions[i * 3 + 1] = Math.sin(angle) * r
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2

      particleColors[i * 3] = 1.0
      particleColors[i * 3 + 1] = 0.8 + Math.random() * 0.2
      particleColors[i * 3 + 2] = 0.0
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

    const particleMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })
    const sparkParticles = new THREE.Points(particleGeo, particleMat)
    sparkParticles.visible = false
    scene.add(sparkParticles)
    sparkParticlesRef.current = sparkParticles

    // Animasyon Döngüsü
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Kamera hafif nefes alma / 3D derinlik salınımı
      if (cameraRef.current) {
        cameraRef.current.position.x = Math.sin(time * 0.5) * 0.05
        cameraRef.current.position.y = -0.6 + Math.cos(time * 0.6) * 0.04
      }

      // Parçacık hareketi
      if (sparkParticlesRef.current && sparkParticlesRef.current.visible) {
        sparkParticlesRef.current.rotation.z -= delta * 4
      }

      renderer.render(scene, camera)
    }
    animate()

    // Resize Observer
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect
        if (w > 0 && h > 0) {
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
      }
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      resizeObserver.disconnect()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // ── 3. Bahisler veya Dilim Güncellendiğinde Dokuyu Yenile ──
  useEffect(() => {
    if (textureCanvasRef.current && wheelTextureRef.current) {
      drawWheelTexture()
      wheelTextureRef.current.needsUpdate = true
    }
  }, [myBets, activeWinSeg])

  // ── 4. Rotasyon ve Fizik Senkronizasyonu ──
  useEffect(() => {
    if (!wheelGroupRef.current) return
    const targetRad = THREE.MathUtils.degToRad(-currentRotationDeg)
    wheelGroupRef.current.rotation.z = targetRad

    // İğneye dönme anında hafif fiziksel geri sekme (flick)
    if (pointerMeshRef.current && isSpinning) {
      pointerMeshRef.current.rotation.z = (Math.sin(Date.now() * 0.04) * 0.12)
    } else if (pointerMeshRef.current) {
      pointerMeshRef.current.rotation.z = 0
    }

    if (sparkParticlesRef.current) {
      sparkParticlesRef.current.visible = isSpinning
    }
  }, [currentRotationDeg, isSpinning])

  // ── 5. 3D Raycasting (Dilime tıklayarak bahis yapma) ──
  const handlePointerDown = (e) => {
    if (isSpinning || !rendererRef.current || !cameraRef.current || !wheelGroupRef.current) return

    const rect = rendererRef.current.domElement.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current)

    // Merkezden tıklanan vektörün açısını bul
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(planeZ, target)

    if (target) {
      const dist = Math.hypot(target.x, target.y)
      if (dist >= 0.5 && dist <= 2.05) {
        // Çarkın mevcut dönüş açısını hesaba katarak dilimi hesapla
        let clickAngle = Math.atan2(target.y, target.x) + Math.PI / 2
        let currentWheelAngle = -wheelGroupRef.current.rotation.z
        let effectiveAngle = (clickAngle - currentWheelAngle) % (Math.PI * 2)
        if (effectiveAngle < 0) effectiveAngle += Math.PI * 2

        const segIdx = Math.floor((effectiveAngle / (Math.PI * 2)) * N) % N
        if (onSelectSegment) {
          onSelectSegment(segIdx)
        }
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isSpinning ? 'not-allowed' : 'pointer',
        touchAction: 'none',
      }}
    />
  )
}
