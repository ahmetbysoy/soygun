import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { SEG } from '../gameSync.js'

export default function ThreeWheel3D({
  rotationAngle = 0,
  isSpinning = false,
  activeWinSeg = null,
  onPointerTick,
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const wheelGroupRef = useRef(null)
  const pointerMeshRef = useRef(null)
  const rendererRef = useRef(null)
  const animFrameRef = useRef(null)
  const spotLightRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())

  // Canlı Reaktif Ref'ler (Render döngüsünün daima güncel state'e erişmesi için)
  const rotationAngleRef = useRef(rotationAngle)
  const isSpinningRef = useRef(isSpinning)
  const activeWinSegRef = useRef(activeWinSeg)
  const onPointerTickRef = useRef(onPointerTick)

  useEffect(() => {
    rotationAngleRef.current = rotationAngle
  }, [rotationAngle])

  useEffect(() => {
    isSpinningRef.current = isSpinning
  }, [isSpinning])

  useEffect(() => {
    activeWinSegRef.current = activeWinSeg
  }, [activeWinSeg])

  useEffect(() => {
    onPointerTickRef.current = onPointerTick
  }, [onPointerTick])

  const currentVisualAngle = useRef(0)
  const lastTickAngle = useRef(0)
  const pointerSpring = useRef({ angle: 0, velocity: 0 })

  const N = SEG.length
  const SEG_RAD = (2 * Math.PI) / N

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 360
    const height = container.clientHeight || 360

    // 1. Scene & Camera (Geniş açı, odaklanmış ve lüks sahne)
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Sahne arka planı şeffaf ve hafif derinlikli
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, -0.25, 5.2)
    camera.lookAt(0, 0, 0)

    // 2. WebGL Renderer (Ultra Hi-DPI, HDR Tone Mapping & Parıltı)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.65 // Işıltıyı ve lüks altın tonlarını parlat
    rendererRef.current = renderer

    container.appendChild(renderer.domElement)

    // 3. Lüks Kumarhane Aydınlatma Katmanı (Studio Lighting Setup)
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 1.6) // Sıcak altın ambiyans
    scene.add(ambientLight)

    const mainGoldLight = new THREE.DirectionalLight(0xffea75, 2.8)
    mainGoldLight.position.set(3, 5, 6)
    scene.add(mainGoldLight)

    const fillCyanLight = new THREE.DirectionalLight(0x38bdf8, 1.4)
    fillCyanLight.position.set(-4, -2, 4)
    scene.add(fillCyanLight)

    const bottomRimLight = new THREE.DirectionalLight(0xa855f7, 1.2)
    bottomRimLight.position.set(0, -5, 3)
    scene.add(bottomRimLight)

    // Tepe İbre ve Kazanan Dilim Odaklı Spot Işık
    const spotLight = new THREE.SpotLight(0xffd700, 4.5, 12, Math.PI / 4, 0.3)
    spotLight.position.set(0, 3.5, 4.2)
    spotLight.target.position.set(0, 1.6, 0)
    scene.add(spotLight)
    scene.add(spotLight.target)
    spotLightRef.current = spotLight

    // 4. Main 3D Wheel Group
    const wheelGroup = new THREE.Group()
    scene.add(wheelGroup)
    wheelGroupRef.current = wheelGroup

    const disposableGeometries = []
    const disposableMaterials = []
    const disposableTextures = []

    // A) Dış Altın Metalik Çember (Gleaming Gold Ring)
    const rimGeo = new THREE.TorusGeometry(1.98, 0.11, 24, 72)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0x442c00,
      metalness: 0.95,
      roughness: 0.12,
    })
    disposableGeometries.push(rimGeo)
    disposableMaterials.push(rimMat)
    const rimMesh = new THREE.Mesh(rimGeo, rimMat)
    rimMesh.position.z = 0.07
    wheelGroup.add(rimMesh)

    // B) İç Yaldızlı Çerçeve Halkası (Inner Bezel)
    const innerBezelGeo = new THREE.TorusGeometry(1.86, 0.04, 16, 64)
    const innerBezelMat = new THREE.MeshStandardMaterial({
      color: 0xffe28a,
      metalness: 0.98,
      roughness: 0.08,
    })
    disposableGeometries.push(innerBezelGeo)
    disposableMaterials.push(innerBezelMat)
    const innerBezel = new THREE.Mesh(innerBezelGeo, innerBezelMat)
    innerBezel.position.z = 0.09
    wheelGroup.add(innerBezel)

    // C) Çark Taban Diski (Lüks Derinlik)
    const baseGeo = new THREE.CylinderGeometry(1.94, 1.94, 0.14, 64)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f1422,
      metalness: 0.85,
      roughness: 0.25,
    })
    disposableGeometries.push(baseGeo)
    disposableMaterials.push(baseMat)
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.rotation.x = Math.PI / 2
    baseMesh.position.z = -0.07
    wheelGroup.add(baseMesh)

    // D) 12 Dilim Geometrisi ve Yüksek Kontrastlı Parlak Dokular
    const VIBRANT_PALETTE = {
      'x2.33': { base: '#dc2626', inner: '#f87171', outer: '#991b1b', text: '#ffffff' },
      'x5.82': { base: '#f59e0b', inner: '#fef08a', outer: '#b45309', text: '#1e1b4b' },
      'x11.64': { base: '#10b981', inner: '#6ee7b7', outer: '#047857', text: '#ffffff' },
      '🥷': { base: '#8b5cf6', inner: '#c4b5fd', outer: '#5b21b6', text: '#ffffff' },
      '💣': { base: '#1e293b', inner: '#475569', outer: '#0f172a', text: '#ff4444' },
    }

    SEG.forEach((seg, i) => {
      const segGroup = new THREE.Group()
      const thetaStart = i * SEG_RAD
      const shape = new THREE.Shape()

      shape.moveTo(0, 0)
      shape.arc(0, 0, 1.88, thetaStart, thetaStart + SEG_RAD, false)
      shape.lineTo(0, 0)

      const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.018, bevelThickness: 0.02 }
      const segGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      disposableGeometries.push(segGeo)

      const palette = VIBRANT_PALETTE[seg.l] || { base: seg.c || '#3b82f6', inner: '#93c5fd', outer: '#1d4ed8', text: '#ffffff' }

      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')

      // Zengin ve Parıltılı Radyal Gradyan (Karanlık ve çamur renkleri ezdik)
      const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256)
      grad.addColorStop(0, palette.inner)
      grad.addColorStop(0.35, palette.base)
      grad.addColorStop(1, palette.outer)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 512, 512)

      // İnce yaldız ışıltısı çizgisi
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.lineWidth = 4
      ctx.strokeRect(4, 4, 504, 504)

      const texture = new THREE.CanvasTexture(canvas)
      disposableTextures.push(texture)

      const segMat = new THREE.MeshStandardMaterial({
        map: texture,
        color: new THREE.Color(palette.base),
        metalness: 0.45,
        roughness: 0.28,
      })
      disposableMaterials.push(segMat)

      const segMesh = new THREE.Mesh(segGeo, segMat)
      segGroup.add(segMesh)

      // Dilim Metni: Radyal Olarak Dıştan İçe Doğru ve İnanılmaz Keskin Hi-Res Sprite
      const textCanvas = document.createElement('canvas')
      textCanvas.width = 512
      textCanvas.height = 256
      const tCtx = textCanvas.getContext('2d')
      tCtx.clearRect(0, 0, 512, 256)

      // Neon Metin Parıltısı
      tCtx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      tCtx.shadowBlur = 14
      tCtx.shadowOffsetX = 0
      tCtx.shadowOffsetY = 4

      tCtx.fillStyle = palette.text
      tCtx.font = '900 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      tCtx.textAlign = 'center'
      tCtx.textBaseline = 'middle'
      tCtx.fillText(seg.l, 256, 128)

      // Altın Kenarlık Çizgisi
      tCtx.strokeStyle = 'rgba(255, 215, 0, 0.8)'
      tCtx.lineWidth = 3
      tCtx.strokeText(seg.l, 256, 128)

      const textTexture = new THREE.CanvasTexture(textCanvas)
      disposableTextures.push(textTexture)
      const textMat = new THREE.SpriteMaterial({ map: textTexture, transparent: true })
      disposableMaterials.push(textMat)
      const textSprite = new THREE.Sprite(textMat)

      const midAngle = thetaStart + SEG_RAD / 2
      const textRadius = 1.32
      textSprite.position.set(
        Math.cos(midAngle) * textRadius,
        Math.sin(midAngle) * textRadius,
        0.16
      )
      textSprite.scale.set(0.85, 0.42, 1)
      wheelGroup.add(textSprite)

      // Dilim Ayırıcı Lüks Altın Çiviler (Stud Pins)
      const pinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.11, 16)
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0x664400,
        metalness: 0.98,
        roughness: 0.1,
      })
      disposableGeometries.push(pinGeo)
      disposableMaterials.push(pinMat)
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      const pinAngle = thetaStart
      pinMesh.position.set(Math.cos(pinAngle) * 1.84, Math.sin(pinAngle) * 1.84, 0.11)
      pinMesh.rotation.x = Math.PI / 2
      wheelGroup.add(pinMesh)

      wheelGroup.add(segGroup)
    })

    // E) Çevresel Casino LED Ampulleri (Rim Chaser Lights 3D)
    const bulbCount = 24
    for (let b = 0; b < bulbCount; b++) {
      const bulbAngle = (b / bulbCount) * Math.PI * 2
      const bulbGeo = new THREE.SphereGeometry(0.036, 12, 12)
      const bulbMat = new THREE.MeshStandardMaterial({
        color: b % 2 === 0 ? 0xfffbeb : 0xffd700,
        emissive: b % 2 === 0 ? 0xffea75 : 0xff9900,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
      disposableGeometries.push(bulbGeo)
      disposableMaterials.push(bulbMat)
      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat)
      bulbMesh.position.set(Math.cos(bulbAngle) * 1.98, Math.sin(bulbAngle) * 1.98, 0.14)
      wheelGroup.add(bulbMesh)
    }

    // F) Orta Lüks Altın & Yakut Göbek (Central Gold & Ruby Crown Hub)
    const hubOuterGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.18, 36)
    const hubOuterMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0x553300,
      metalness: 0.98,
      roughness: 0.1,
    })
    disposableGeometries.push(hubOuterGeo)
    disposableMaterials.push(hubOuterMat)
    const hubOuterMesh = new THREE.Mesh(hubOuterGeo, hubOuterMat)
    hubOuterMesh.rotation.x = Math.PI / 2
    hubOuterMesh.position.z = 0.12
    wheelGroup.add(hubOuterMesh)

    // Orta Yakut Kristal Çekirdek (Simsiyah delik yerine asil Yakut / Gold logo)
    const rubyCoreGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.19, 32)
    const rubyCoreMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x450a0a,
      metalness: 0.85,
      roughness: 0.15,
    })
    disposableGeometries.push(rubyCoreGeo)
    disposableMaterials.push(rubyCoreMat)
    const rubyCoreMesh = new THREE.Mesh(rubyCoreGeo, rubyCoreMat)
    rubyCoreMesh.rotation.x = Math.PI / 2
    rubyCoreMesh.position.z = 0.14
    wheelGroup.add(rubyCoreMesh)

    // Orta Altın Taç Rozeti
    const crownGeo = new THREE.TorusGeometry(0.35, 0.024, 12, 32)
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xffe28a, metalness: 0.99, roughness: 0.05 })
    disposableGeometries.push(crownGeo)
    disposableMaterials.push(crownMat)
    const crownMesh = new THREE.Mesh(crownGeo, crownMat)
    crownMesh.position.z = 0.24
    wheelGroup.add(crownMesh)

    // 5. 3D Üst İbre (Ultra Keskin Altın & Neon Yakut Pointer)
    const pointerGroup = new THREE.Group()
    const pointerShape = new THREE.Shape()
    pointerShape.moveTo(-0.16, 0.26)
    pointerShape.lineTo(0.16, 0.26)
    pointerShape.lineTo(0, -0.38)
    pointerShape.closePath()

    const pointerGeo = new THREE.ExtrudeGeometry(pointerShape, { depth: 0.10, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025 })
    const pointerMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0x880011,
      metalness: 0.85,
      roughness: 0.18,
    })
    disposableGeometries.push(pointerGeo)
    disposableMaterials.push(pointerMat)
    const pointerMesh = new THREE.Mesh(pointerGeo, pointerMat)
    pointerGroup.add(pointerMesh)

    // İbre tepesine altın mafsal pimi
    const pointerPinGeo = new THREE.SphereGeometry(0.065, 16, 16)
    const pointerPinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.98, roughness: 0.1 })
    disposableGeometries.push(pointerPinGeo)
    disposableMaterials.push(pointerPinMat)
    const pointerPin = new THREE.Mesh(pointerPinGeo, pointerPinMat)
    pointerPin.position.set(0, 0.22, 0.06)
    pointerGroup.add(pointerPin)

    pointerGroup.position.set(0, 2.02, 0.22)
    scene.add(pointerGroup)
    pointerMeshRef.current = pointerGroup

    // 6. Animasyon & Render Döngüsü (Delta Time Entegrasyonlu)
    clockRef.current.start()

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      const dt = Math.min(clockRef.current.getDelta(), 0.05) // Max 50ms delta time clamp

      // Açıyı hedef rotationAngle'a doğru Delta Time ile sönümleyerek yaklaştır (Kademeli Vegas Fren Eğrisi)
      const targetRad = (rotationAngleRef.current * Math.PI) / 180
      const dist = targetRad - currentVisualAngle.current
      // Çark dönerken yüksek hız, son turda ise sinematik pürüzsüz duruş
      const speedAdaptiveFactor = Math.abs(dist) > 2 ? 8 : 14
      const dampingFactor = 1 - Math.exp(-speedAdaptiveFactor * dt)
      currentVisualAngle.current += dist * dampingFactor

      if (wheelGroupRef.current) {
        wheelGroupRef.current.rotation.z = -currentVisualAngle.current

        // İbre Dişli Tık Yay Fiziği (Pointer Spring Physics - Sert Vuruş ve Sekme)
        const angleDeg = ((currentVisualAngle.current * 180) / Math.PI) % 360
        const segStep = 360 / N
        const lastStep = Math.floor(lastTickAngle.current / segStep)
        const curStep = Math.floor(angleDeg / segStep)

        if (curStep !== lastStep) {
          lastTickAngle.current = angleDeg
          // Hıza bağlı dinamik impuls
          const spinSpeed = Math.abs(dist)
          const impulse = Math.min(0.75, 0.25 + spinSpeed * 0.08)
          pointerSpring.current.velocity += impulse
          if (onPointerTickRef.current) onPointerTickRef.current()
        }
      }

      // İbre yayın sönümlenmesi (Doğal Hooke Kanunu & Damped Harmonic Oscillator)
      const springStiffness = 32
      const dampingCoeff = 0.70
      pointerSpring.current.velocity += (0 - pointerSpring.current.angle) * (springStiffness * dt)
      pointerSpring.current.velocity *= Math.pow(dampingCoeff, dt * 60)
      pointerSpring.current.angle += pointerSpring.current.velocity * (60 * dt)

      if (pointerMeshRef.current) {
        pointerMeshRef.current.rotation.z = Math.max(-0.65, Math.min(0.35, pointerSpring.current.angle))
      }

      // Canlı Spot Işık Rengi
      const curWinSeg = activeWinSegRef.current
      if (spotLightRef.current && curWinSeg != null && SEG[curWinSeg]) {
        spotLightRef.current.color.set(SEG[curWinSeg].c || 0xffd700)
      }

      renderer.render(scene, camera)
    }

    animate()

    // ResizeObserver ile kapsayıcı boyut değişimlerini takip et
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
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
      resizeObserver.disconnect()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      // Bellek Sızıntılarını (Memory Leak) Önlemek İçin Tüm Geometri, Doku ve Materyalleri Temizle
      disposableGeometries.forEach(g => g.dispose())
      disposableMaterials.forEach(m => m.dispose())
      disposableTextures.forEach(t => t.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '380px',
        height: '380px',
        margin: '0 auto',
        position: 'relative',
        cursor: 'grab',
      }}
    />
  )
}
