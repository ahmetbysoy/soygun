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

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000)
    camera.position.set(0, -1.2, 5.8)
    camera.lookAt(0, 0, 0)

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    rendererRef.current = renderer

    container.appendChild(renderer.domElement)

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffe28a, 1.8)
    dirLight.position.set(2, 4, 5)
    scene.add(dirLight)

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2)
    rimLight.position.set(-3, -2, 2)
    scene.add(rimLight)

    const spotLight = new THREE.SpotLight(0xffd700, 3.5, 10, Math.PI / 6, 0.4)
    spotLight.position.set(0, 3, 3)
    spotLight.target.position.set(0, 1.8, 0)
    scene.add(spotLight)
    scene.add(spotLight.target)
    spotLightRef.current = spotLight

    // 4. Main 3D Wheel Group
    const wheelGroup = new THREE.Group()
    scene.add(wheelGroup)
    wheelGroupRef.current = wheelGroup

    // Dış Altın Metalik Çember (Rim)
    const rimGeo = new THREE.TorusGeometry(1.95, 0.08, 16, 64)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.2,
    })
    const rimMesh = new THREE.Mesh(rimGeo, rimMat)
    rimMesh.position.z = 0.04
    wheelGroup.add(rimMesh)

    // Çark Taban Diski (Base Cylinder)
    const baseGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.12, 48)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x070a10,
      metalness: 0.9,
      roughness: 0.3,
    })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.rotation.x = Math.PI / 2
    baseMesh.position.z = -0.06
    wheelGroup.add(baseMesh)

    // 12 Dilim Geometrisi ve Canvas Dokuları
    SEG.forEach((seg, i) => {
      const segGroup = new THREE.Group()
      const thetaStart = i * SEG_RAD
      const shape = new THREE.Shape()

      shape.moveTo(0, 0)
      shape.arc(0, 0, 1.88, thetaStart, thetaStart + SEG_RAD, false)
      shape.lineTo(0, 0)

      const extrudeSettings = { depth: 0.06, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 }
      const segGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings)

      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')

      // Dilim Rengi ve Gradient
      const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128)
      grad.addColorStop(0, seg.c || '#1a2333')
      grad.addColorStop(1, '#080c14')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 256, 256)

      // Yazı / Emoji
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 6
      ctx.fillText(seg.l, 128, 128)

      const texture = new THREE.CanvasTexture(canvas)
      const segMat = new THREE.MeshStandardMaterial({
        map: texture,
        color: new THREE.Color(seg.c || '#1f293d'),
        metalness: 0.35,
        roughness: 0.35,
      })

      const segMesh = new THREE.Mesh(segGeo, segMat)
      segGroup.add(segMesh)

      // Dilim Ayırıcı Metalik Çiviler (Stud Pins)
      const pinGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.08, 12)
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xffe28a, metalness: 0.95, roughness: 0.15 })
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      const pinAngle = thetaStart
      pinMesh.position.set(Math.cos(pinAngle) * 1.82, Math.sin(pinAngle) * 1.82, 0.08)
      pinMesh.rotation.x = Math.PI / 2
      wheelGroup.add(pinMesh)

      wheelGroup.add(segGroup)
    })

    // Orta Kartel Altın Rozeti (Central Hub)
    const hubGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.16, 32)
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.18,
    })
    const hubMesh = new THREE.Mesh(hubGeo, hubMat)
    hubMesh.rotation.x = Math.PI / 2
    hubMesh.position.z = 0.08
    wheelGroup.add(hubMesh)

    // Orta Rozet İçi Mini Amblem
    const badgeInnerGeo = new THREE.CircleGeometry(0.32, 32)
    const badgeInnerMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.5, roughness: 0.5 })
    const badgeInner = new THREE.Mesh(badgeInnerGeo, badgeInnerMat)
    badgeInner.position.z = 0.17
    wheelGroup.add(badgeInner)

    // 5. 3D Üst İbre (Pointer Pin)
    const pointerGroup = new THREE.Group()
    const pointerShape = new THREE.Shape()
    pointerShape.moveTo(-0.14, 0.22)
    pointerShape.lineTo(0.14, 0.22)
    pointerShape.lineTo(0, -0.32)
    pointerShape.closePath()

    const pointerGeo = new THREE.ExtrudeGeometry(pointerShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 })
    const pointerMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0x660011,
      metalness: 0.7,
      roughness: 0.25,
    })
    const pointerMesh = new THREE.Mesh(pointerGeo, pointerMat)
    pointerGroup.add(pointerMesh)
    pointerGroup.position.set(0, 1.96, 0.15)
    scene.add(pointerGroup)
    pointerMeshRef.current = pointerGroup

    // 6. Animasyon & Render Döngüsü
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      // Açıyı hedef rotationAngle'a doğru sönümleyerek yaklaştır
      const targetRad = (rotationAngle * Math.PI) / 180
      currentVisualAngle.current += (targetRad - currentVisualAngle.current) * 0.15

      if (wheelGroupRef.current) {
        wheelGroupRef.current.rotation.z = -currentVisualAngle.current

        // İbre Dişli Tık Yay Fiziği (Pointer Spring Physics)
        const angleDeg = ((currentVisualAngle.current * 180) / Math.PI) % 360
        const segStep = 360 / N
        const lastStep = Math.floor(lastTickAngle.current / segStep)
        const curStep = Math.floor(angleDeg / segStep)

        if (curStep !== lastStep) {
          lastTickAngle.current = angleDeg
          pointerSpring.current.velocity += 0.35
          if (onPointerTick) onPointerTick()
        }
      }

      // İbre yayın sönümlenmesi
      pointerSpring.current.velocity += (0 - pointerSpring.current.angle) * 0.2
      pointerSpring.current.velocity *= 0.78
      pointerSpring.current.angle += pointerSpring.current.velocity

      if (pointerMeshRef.current) {
        pointerMeshRef.current.rotation.z = pointerSpring.current.angle
      }

      // Canlı Spot Işık Rengi
      if (spotLightRef.current && activeWinSeg != null && SEG[activeWinSeg]) {
        spotLightRef.current.color.set(SEG[activeWinSeg].c || 0xffd700)
      }

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || 360
      const h = container.clientHeight || 360
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
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
