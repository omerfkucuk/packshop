"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import type { BagDimensionsMm } from "@lib/util/parse-variant-dimensions"
import BoxMesh from "./box-mesh"
import BagMesh from "./bag-mesh"

export type Dimensions3D = { length: number; width: number; height: number }

// The product being previewed and its real size in mm.
export type PackagingShape =
  | { type: "fefco-0201"; dimensionsMm: Dimensions3D }
  | { type: "courier-bag"; dimensionsMm: BagDimensionsMm }

type BoxPreview3DProps = {
  panels: PanelGeometry[]
  resolvedLayout?: ResolvedLayout | null
  backgroundColors?: Record<string, string>
  shape: PackagingShape
  className?: string
  /** See BoxMesh's own doc - fires with a printed face's panel name on
   *  click, omitted entirely means the box itself doesn't respond to
   *  clicks (orbit/zoom still always works, via OrbitControls). */
  onFaceClick?: (panelName: string) => void
}

// Orbit/zoom preview of the assembled box or sealed bag - actual element
// editing always
// stays on the precise mm-based 2D dieline (DielinePreview); clicking a
// printed face here (onFaceClick) is a shortcut INTO that same 2D editor,
// not a second editing surface of its own. Loaded via
// next/dynamic({ssr:false}) from designer-shell, so the three.js bundle
// only downloads once the customer actually switches to this view.
const BoxPreview3D = ({
  panels,
  resolvedLayout,
  backgroundColors,
  shape,
  className,
  onFaceClick,
}: BoxPreview3DProps) => {
  // Scene-unit convention: meters, not raw mm - three.js's default light
  // intensities, camera near/far planes, and OrbitControls' own internal
  // defaults are all implicitly tuned assuming roughly meter-scale scenes.
  const isBag = shape.type === "courier-bag"
  const heightM = shape.dimensionsMm.height / 1000
  const extentM = isBag
    ? [shape.dimensionsMm.width / 1000, heightM]
    : [shape.dimensionsMm.length / 1000, shape.dimensionsMm.width / 1000, heightM]

  // Derived from the model's own size, not a hardcoded constant - this
  // designer allows arbitrary custom box sizes, and a fixed camera
  // distance would clip through a very flat box or dwarf a very tall one.
  const boundingRadius = 0.5 * Math.hypot(...extentM)

  return (
    <div className={className}>
      <Canvas
        camera={{
          // A flat bag reads best nearly head-on; a box from a corner.
          position: isBag
            ? [boundingRadius * 0.9, boundingRadius * 0.5, boundingRadius * 2.8]
            : [boundingRadius * 2.2, boundingRadius * 1.6, boundingRadius * 2.2],
          fov: 35,
        }}
      >
        <Suspense fallback={null}>
          <directionalLight
            position={[boundingRadius * 3, boundingRadius * 4, boundingRadius * 2]}
            intensity={0.6}
          />
          {/* Procedural studio rig instead of an HDRI preset - no external
              asset fetch (matches this project's no-network-dependency
              rendering philosophy), and it's what actually fixed the "flat
              plastic" look: image-based lighting from soft panels gives the
              board real gradient/reflection instead of two hard directional
              lights. */}
          <Environment resolution={256}>
            <Lightformer
              intensity={2.5}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, boundingRadius * 6, 0]}
              scale={[boundingRadius * 10, boundingRadius * 10, 1]}
            />
            <Lightformer
              intensity={0.8}
              rotation={[0, Math.PI / 2, 0]}
              position={[-boundingRadius * 6, boundingRadius, 0]}
              scale={[boundingRadius * 10, boundingRadius * 10, 1]}
            />
            <Lightformer
              intensity={0.8}
              rotation={[0, -Math.PI / 2, 0]}
              position={[boundingRadius * 6, boundingRadius, 0]}
              scale={[boundingRadius * 10, boundingRadius * 10, 1]}
            />
            <Lightformer
              intensity={0.4}
              position={[0, boundingRadius, -boundingRadius * 6]}
              scale={[boundingRadius * 10, boundingRadius * 10, 1]}
            />
            {/* A bag is viewed nearly head-on, so its front needs a key
                light of its own - without it white film renders mid-gray. */}
            {isBag && (
              <Lightformer
                intensity={1.6}
                position={[0, boundingRadius, boundingRadius * 6]}
                scale={[boundingRadius * 10, boundingRadius * 10, 1]}
              />
            )}
          </Environment>
          {shape.type === "courier-bag" ? (
            <BagMesh
              panels={panels}
              resolvedLayout={resolvedLayout}
              backgroundColors={backgroundColors}
              dimensionsM={{
                width: shape.dimensionsMm.width / 1000,
                height: heightM,
                flapHeight: shape.dimensionsMm.flapHeight / 1000,
              }}
              onFaceClick={onFaceClick}
            />
          ) : (
            <BoxMesh
              panels={panels}
              resolvedLayout={resolvedLayout}
              backgroundColors={backgroundColors}
              dimensionsM={{
                length: shape.dimensionsMm.length / 1000,
                width: shape.dimensionsMm.width / 1000,
                height: heightM,
              }}
              onFaceClick={onFaceClick}
            />
          )}
        </Suspense>
        {/* Grounds the box - without this it visibly floats, one of the
            biggest "this is obviously a 3D render" tells. */}
        <ContactShadows
          position={[0, -heightM / 2 - 0.001, 0]}
          opacity={0.45}
          blur={2.4}
          far={boundingRadius * 3}
          scale={boundingRadius * 6}
          resolution={512}
        />
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
