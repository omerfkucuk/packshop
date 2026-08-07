import { resolveRelativePosition, ResolvedBox } from "../relative-resolver"

const reference: ResolvedBox = {
  position: { x: 100, y: 100 },
  size: { w: 40, h: 20 },
}
const size = { w: 10, h: 10 }

describe("resolveRelativePosition", () => {
  it("places 'above' at a larger Y than the reference (Y-up space)", () => {
    const pos = resolveRelativePosition("above", reference, size)
    expect(pos.y).toBeGreaterThan(reference.position.y + reference.size.h)
    // horizontally centered on the reference
    expect(pos.x).toBeCloseTo(115)
  })

  it("places 'below' at a smaller Y than the reference", () => {
    const pos = resolveRelativePosition("below", reference, size)
    expect(pos.y).toBeLessThan(reference.position.y)
  })

  it("places 'left-of' at a smaller X than the reference", () => {
    const pos = resolveRelativePosition("left-of", reference, size)
    expect(pos.x).toBeLessThan(reference.position.x)
  })

  it("places 'right-of' at a larger X than the reference", () => {
    const pos = resolveRelativePosition("right-of", reference, size)
    expect(pos.x).toBeGreaterThan(reference.position.x + reference.size.w)
  })

  it("centers 'inside' the reference box", () => {
    const pos = resolveRelativePosition("inside", reference, size)
    expect(pos.x).toBeCloseTo(115)
    expect(pos.y).toBeCloseTo(105)
  })

  it("a larger gapHint pushes the element further away", () => {
    const tight = resolveRelativePosition("below", reference, size, "tight")
    const loose = resolveRelativePosition("below", reference, size, "loose")
    expect(loose.y).toBeLessThan(tight.y)
  })
})
