import * as THREE from "three"

const GRAIN_PX = 128

let cached: THREE.CanvasTexture | null = null

// A real corrugated board is never a perfectly flat diffuse/rough surface -
// this cheap procedural speckle (two blended random octaves, no external
// image asset) is used as the 3D preview's bumpMap + roughnessMap so a
// printed panel reads as textured board rather than a flat plastic decal.
// Generated once and cached; callers .clone() it per-face to set a
// face-size-relative repeat (see box-mesh.tsx).
export const getGrainTexture = (): THREE.CanvasTexture => {
  if (cached) return cached

  const canvas = document.createElement("canvas")
  canvas.width = GRAIN_PX
  canvas.height = GRAIN_PX
  const ctx = canvas.getContext("2d")!

  const image = ctx.createImageData(GRAIN_PX, GRAIN_PX)
  for (let i = 0; i < image.data.length; i += 4) {
    const coarse = 128 + (Math.random() - 0.5) * 40
    const fine = (Math.random() - 0.5) * 60
    const v = Math.max(0, Math.min(255, coarse + fine))
    image.data[i] = v
    image.data[i + 1] = v
    image.data[i + 2] = v
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  cached = texture
  return texture
}
