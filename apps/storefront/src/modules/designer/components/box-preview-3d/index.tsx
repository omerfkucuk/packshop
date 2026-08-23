"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import BoxMesh from "./box-mesh"

export type Dimensions3D = { length: number; width: number; height: number }

type BoxPreview3DProps = {
  panels: PanelGeometry[]
  resolvedLayout?: ResolvedLayout | null
  backgroundColors?: Record<string, string>
  dimensionsMm: Dimensions3D
  className?: string
}

// Read-only preview of the assembled box - orbit/rotate only, no editing
// (editing stays on the precise mm-based 2D dieline, DielinePreview).
// Loaded via next/dynamic({ssr:false}) from designer-shell, so the three.js
// bundle only downloads once the customer actually switches to this view.
const BoxPreview3D = ({
  panels,
  resolvedLayout,
  backgroundColors,
  dimensionsMm,
  className,
}: BoxPreview3DProps) => {
  // Scene-unit convention: meters, not raw mm - three.js's default light
  // intensities, camera near/far planes, and OrbitControls' own internal
  // defaults are all implicitly tuned assuming roughly meter-scale scenes.
  const lengthM = dimensionsMm.length / 1000
  const widthM = dimensionsMm.width / 1000
  const heightM = dimensionsMm.height / 1000

  // Derived from the model's own size, not a hardcoded constant - this
  // designer allows arbitrary custom box sizes, and a fixed camera
  // distance would clip through a very flat box or dwarf a very tall one.
  const boundingRadius = 0.5 * Math.hypot(lengthM, widthM, heightM)

  return (
    <div className={className}>
      <Canvas
        camera={{
          position: [boundingRadius * 2.2, boundingRadius * 1.6, boundingRadius * 2.2],
          fov: 35,
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.65} />
          <directionalLight
            position={[boundingRadius * 3, boundingRadius * 4, boundingRadius * 2]}
            intensity={0.8}
          />
          <directionalLight
            position={[-boundingRadius * 3, boundingRadius, -boundingRadius * 2]}
            intensity={0.3}
          />
          <BoxMesh
            panels={panels}
            resolvedLayout={resolvedLayout}
            backgroundColors={backgroundColors}
            dimensionsM={{ length: lengthM, width: widthM, height: heightM }}
          />
        </Suspense>
        <OrbitControls
          enablePan={false}
          makeDefault
          minDistance={boundingRadius * 1.4}
          maxDistance={boundingRadius * 5}
        />
      </Canvas>
    </div>
  )
}

export default BoxPreview3D
