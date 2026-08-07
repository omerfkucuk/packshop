import { placeDesign, fitCenter } from "@dtc/packaging-engine/placement"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { SelectedElement } from "../types"

export type AppliedLogo = {
  url: string
  x: number
  y: number
  w: number
  h: number
}

export type AppliedSlogan = {
  text: string
  font: string | null
  x: number
  y: number
  fontSize: number
}

export type AppliedPanelDesign = {
  panelName: string
  backgroundColor: string | null
  logo: AppliedLogo | null
  slogan: AppliedSlogan | null
}

// Logo is centered in a box this fraction of the zone's size - not its real
// size (that's not known without loading the image), but placeDesign/
// fitCenter only need a target box to center, and SVG's own aspect-fit
// (preserveAspectRatio) handles containing the actual image inside it.
const LOGO_BOX_RATIO = 0.5
const LOGO_BOX_RATIO_WITH_SLOGAN = 0.4

const SLOGAN_FONT_RATIO = 0.045
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 40

// Rule-based first pass at "apply the selected brand elements to the box":
// same background color, same logo, and the slogan (in the selected font,
// if any) repeated identically across every main panel. No real AI/text
// prompt involved yet - see DesignerShell's AI bar.
export function applyDesign(
  panels: PanelGeometry[],
  elements: SelectedElement[]
): AppliedPanelDesign[] {
  const backgroundColor =
    elements.find((el) => el.type === "color")?.value ?? null
  const logoUrl = elements.find((el) => el.type === "logo")?.value ?? null
  const slogan = elements.find((el) => el.type === "text") ?? null
  const font = elements.find((el) => el.type === "font")?.value ?? null

  return panels
    .filter((panel) => panel.printZones.length > 0) // the 4 main faces only
    .map((panel) => {
      const zone = panel.printZones[0]
      const zoneOrigin = {
        x: Math.min(...zone.boundary.map((p) => p.x)),
        y: Math.min(...zone.boundary.map((p) => p.y)),
      }

      let logo: AppliedLogo | null = null
      if (logoUrl) {
        const ratio = slogan ? LOGO_BOX_RATIO_WITH_SLOGAN : LOGO_BOX_RATIO
        const naturalSize = {
          w: zone.boundingBox.w * ratio,
          h: zone.boundingBox.h * ratio,
        }
        const [placed] = placeDesign(
          zone,
          [{ id: "logo", type: "logo", naturalSize }],
          fitCenter
        )
        // Nudge up a bit so there's clear room for the slogan underneath.
        const yOffset = slogan ? zone.boundingBox.h * 0.08 : 0
        logo = {
          url: logoUrl,
          x: placed.position.x,
          y: placed.position.y + yOffset,
          w: placed.size.w,
          h: placed.size.h,
        }
      }

      let sloganPlacement: AppliedSlogan | null = null
      if (slogan) {
        const fontSize = Math.min(
          MAX_FONT_SIZE,
          Math.max(MIN_FONT_SIZE, zone.boundingBox.w * SLOGAN_FONT_RATIO)
        )
        sloganPlacement = {
          text: slogan.value,
          font,
          x: zoneOrigin.x + zone.boundingBox.w / 2,
          y: zoneOrigin.y + zone.boundingBox.h * 0.12,
          fontSize,
        }
      }

      return {
        panelName: panel.panelName,
        backgroundColor,
        logo,
        slogan: sloganPlacement,
      }
    })
}
