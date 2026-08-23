import type { ReactNode } from "react"

// Hand-authored placeholder catalog, proving the full pipeline (picker ->
// selection -> theme slot -> brand-color recolor -> canvas render) end to
// end - swap/extend with real designed assets later, same shape.
//
// Every recolorable entry's markup must use fill="currentColor" (or
// stroke="currentColor") throughout: it's embedded once as an SVG <symbol>
// and referenced via <use style={{ color }}>, so `currentColor` is what
// lets the same symbol render in the picker's ambient text color AND in
// any brand color on the canvas, with no extra code either place.

export type LibraryElementCategory = "icon" | "shape" | "pattern"

export interface LibraryElement {
  id: string
  label: string
  category: LibraryElementCategory
  viewBox: string
  markup: ReactNode
  recolorable: boolean
}

export const ELEMENT_LIBRARY: LibraryElement[] = [
  {
    id: "three-circles",
    label: "Üç Daire",
    category: "pattern",
    // Tightly cropped to the three circles' own combined bounding box - a
    // loose viewBox (originally "0 0 100 100") left empty padding baked
    // into the symbol itself, so the drag/resize frame (which tracks this
    // box) never actually hugged the visible artwork, however far it was
    // dragged/resized. The placement engine always sizes library elements
    // into a SQUARE box (no natural-aspect-ratio info flows through for
    // them, unlike an uploaded logo's real pixel size), so the two circles'
    // cy are nudged 4.5mm apart from the original layout to make the
    // bounding box exactly square too - otherwise a non-square crop would
    // still letterbox inside that square box, just a smaller gap than
    // before instead of none.
    viewBox: "5 5.5 82 82",
    recolorable: true,
    markup: (
      <>
        <circle cx="35" cy="35.5" r="30" fill="currentColor" opacity={0.85} />
        <circle cx="65" cy="35" r="22" fill="currentColor" opacity={0.85} />
        <circle cx="55" cy="69.5" r="18" fill="currentColor" opacity={0.85} />
      </>
    ),
  },
  {
    id: "leaf",
    label: "Yaprak",
    category: "shape",
    // Tightly cropped to the rotated ellipse's own bounding box - same
    // reasoning as three-circles above.
    viewBox: "17.1 17.1 65.8 65.8",
    recolorable: true,
    markup: (
      <ellipse
        cx="50"
        cy="50"
        rx="42"
        ry="20"
        fill="currentColor"
        transform="rotate(45 50 50)"
      />
    ),
  },
  {
    id: "badge",
    label: "Rozet",
    category: "icon",
    // Tightly cropped to the rect's own bounds - same reasoning as
    // three-circles above.
    viewBox: "18 18 64 64",
    recolorable: true,
    markup: <rect x="18" y="18" width="64" height="64" rx="16" fill="currentColor" />,
  },
  // Below: Tabler Icons (https://tabler.io/icons, MIT-licensed), the
  // "-filled" (solid, single-color) variants pulled from @iconify-json/tabler
  // at their own native "0 0 24 24" viewBox - each icon's own body already
  // sits centered/cropped in that square by design, so unlike the
  // hand-drawn entries above these weren't individually re-cropped. The raw
  // path markup is trusted, build-time-bundled data (not user input),
  // injected via dangerouslySetInnerHTML since it comes straight from the
  // icon set rather than being hand-authored JSX.
  {
    id: "star",
    label: "Yıldız",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"m8.243 7.34l-6.38.925l-.113.023a1 1 0 0 0-.44 1.684l4.622 4.499l-1.09 6.355l-.013.11a1 1 0 0 0 1.464.944l5.706-3l5.693 3l.1.046a1 1 0 0 0 1.352-1.1l-1.091-6.355l4.624-4.5l.078-.085a1 1 0 0 0-.633-1.62l-6.38-.926l-2.852-5.78a1 1 0 0 0-1.794 0z\"/>" }} />,
  },
  {
    id: "heart",
    label: "Kalp",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074\"/>" }} />,
  },
  {
    id: "gift",
    label: "Hediye",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M11 14v8H7a3 3 0 0 1-3-3v-4a1 1 0 0 1 1-1zm8 0a1 1 0 0 1 1 1v4a3 3 0 0 1-3 3h-4v-8zM16.5 2a3.5 3.5 0 0 1 3.163 5H20a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-7V7h-2v5H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h.337A3.5 3.5 0 0 1 4 5.5C4 3.567 5.567 2 7.483 2c1.755-.03 3.312 1.092 4.381 2.934l.136.243c1.033-1.914 2.56-3.114 4.291-3.175zm-9 2a1.5 1.5 0 0 0 0 3h3.143C9.902 5.095 8.694 3.98 7.5 4m8.983 0c-1.18-.02-2.385 1.096-3.126 3H16.5a1.5 1.5 0 1 0-.017-3\"/>" }} />,
  },
  {
    id: "tag",
    label: "Etiket",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M11.172 2a3 3 0 0 1 2.121.879l7.71 7.71a3.41 3.41 0 0 1 0 4.822l-5.592 5.592a3.41 3.41 0 0 1-4.822 0l-7.71-7.71A3 3 0 0 1 2 11.172V6a4 4 0 0 1 4-4zM7.5 5.5a2 2 0 0 0-1.995 1.85L5.5 7.5a2 2 0 1 0 2-2\"/>" }} />,
  },
  {
    id: "diamond",
    label: "Elmas",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M18 4a1 1 0 0 1 .783.378l.074.108l3 5a1 1 0 0 1-.032 1.078l-.08.103l-8.53 9.533a1.7 1.7 0 0 1-1.215.51c-.4 0-.785-.14-1.11-.417l-.135-.126l-8.5-9.5A1 1 0 0 1 2.083 9.6l.06-.115l3.013-5.022l.064-.09a1 1 0 0 1 .155-.154l.089-.064l.088-.05l.05-.023l.06-.025l.109-.032l.112-.02L6 4zM9.114 7.943a1 1 0 0 0-1.371.343l-.6 1l-.06.116a1 1 0 0 0 .177 1.07l2 2.2l.09.088a1 1 0 0 0 1.323-.02l.087-.09a1 1 0 0 0-.02-1.323l-1.501-1.65l.218-.363l.055-.103a1 1 0 0 0-.398-1.268\"/>" }} />,
  },
  {
    id: "crown",
    label: "Taç",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M19 19H5c-.5 0-.9-.3-1-.8l-2-10c0-.4.1-.8.5-1.1c.4-.2.8-.2 1.1 0l4.1 3.3l3.4-5.1c.4-.6 1.3-.6 1.7 0l3.4 5.1l4.1-3.3c.3-.3.8-.3 1.1 0c.4.2.5.6.5 1.1l-2 10c0 .5-.5.8-1 .8z\"/>" }} />,
  },
  {
    id: "shield-check",
    label: "Kalkan",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"m11.998 2l.118.007l.059.008l.061.013l.111.034a1 1 0 0 1 .217.112l.104.082l.255.218a11 11 0 0 0 7.189 2.537l.342-.01a1 1 0 0 1 1.005.717a13 13 0 0 1-9.208 16.25a1 1 0 0 1-.502 0A13 13 0 0 1 2.54 5.718a1 1 0 0 1 1.005-.717a11 11 0 0 0 7.531-2.527l.263-.225l.096-.075a1 1 0 0 1 .217-.112l.112-.034a1 1 0 0 1 .119-.021zm3.71 7.293a1 1 0 0 0-1.415 0L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.32 1.497l2 2l.094.083a1 1 0 0 0 1.32-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32z\"/>" }} />,
  },
  {
    id: "bolt",
    label: "Şimşek",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"m13 2l.018.001l.016.001l.083.005l.011.002h.011l.038.009l.052.008l.016.006l.011.001l.029.011l.052.014l.019.009l.015.004l.028.014l.04.017l.021.012l.022.01l.023.015l.031.017l.034.024l.018.011l.013.012l.024.017l.038.034l.022.017l.008.01l.014.012l.036.041l.026.027l.006.009c.12.147.196.322.218.513l.001.012l.002.041L14 3v6h5a1 1 0 0 1 .868 1.497l-.06.091l-8 11C11.24 22.371 10 21.968 10 21v-6H5a1 1 0 0 1-.868-1.497l.06-.091l8-11l.01-.013l.018-.024l.033-.038l.018-.022l.009-.008l.013-.014l.04-.036l.028-.026l.008-.006a1 1 0 0 1 .402-.199l.011-.001l.027-.005l.074-.013l.011-.001l.041-.002z\"/>" }} />,
  },
  {
    id: "sun",
    label: "Güneş",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M12 19a1 1 0 0 1 .993.883L13 20v1a1 1 0 0 1-1.993.117L11 21v-1a1 1 0 0 1 1-1m6.313-2.09l.094.083l.7.7a1 1 0 0 1-1.32 1.497l-.094-.083l-.7-.7a1 1 0 0 1 1.218-1.567zm-11.306.083a1 1 0 0 1 .083 1.32l-.083.094l-.7.7a1 1 0 0 1-1.497-1.32l.083-.094l.7-.7a1 1 0 0 1 1.414 0M4 11a1 1 0 0 1 .117 1.993L4 13H3a1 1 0 0 1-.117-1.993L3 11zm17 0a1 1 0 0 1 .117 1.993L21 13h-1a1 1 0 0 1-.117-1.993L20 11zM6.213 4.81l.094.083l.7.7a1 1 0 0 1-1.32 1.497l-.094-.083l-.7-.7A1 1 0 0 1 6.11 4.74zm12.894.083a1 1 0 0 1 .083 1.32l-.083.094l-.7.7a1 1 0 0 1-1.497-1.32l.083-.094l.7-.7a1 1 0 0 1 1.414 0M12 2a1 1 0 0 1 .993.883L13 3v1a1 1 0 0 1-1.993.117L11 4V3a1 1 0 0 1 1-1m0 5a5 5 0 1 1-4.995 5.217L7 12l.005-.217A5 5 0 0 1 12 7\"/>" }} />,
  },
  {
    id: "moon",
    label: "Ay",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M12 1.992a10 10 0 1 0 9.236 13.838c.341-.82-.476-1.644-1.298-1.31a6.5 6.5 0 0 1-6.864-10.787l.077-.08c.551-.63.113-1.653-.758-1.653h-.266l-.068-.006z\"/>" }} />,
  },
  {
    id: "cloud",
    label: "Bulut",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M10.04 4.305c2.195-.667 4.615-.224 6.36 1.176c1.386 1.108 2.188 2.686 2.252 4.34l.003.212l.091.003c2.3.107 4.143 1.961 4.25 4.27l.004.211c0 2.407-1.885 4.372-4.255 4.482l-.21.005H6.657l-.222-.008c-2.94-.11-5.317-2.399-5.43-5.263L1 13.517C1 10.77 3.08 8.507 5.784 8.1l.114-.016l.07-.181c.663-1.62 2.056-2.906 3.829-3.518l.244-.08z\"/>" }} />,
  },
  {
    id: "flame",
    label: "Alev",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M10 2c0-.88 1.056-1.331 1.692-.722c1.958 1.876 3.096 5.995 1.75 9.12l-.08.174l.012.003c.625.133 1.203-.43 2.303-2.173l.14-.224a1 1 0 0 1 1.582-.153C18.733 9.46 20 12.402 20 14.295C20 18.56 16.409 22 12 22s-8-3.44-8-7.706c0-2.252 1.022-4.716 2.632-6.301l.605-.589c.241-.236.434-.43.618-.624C9.285 5.268 10 3.856 10 2\"/>" }} />,
  },
  {
    id: "award",
    label: "Ödül",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"m19.496 13.983l1.966 3.406a1 1 0 0 1-.705 1.488l-.113.011l-.112-.001l-2.933-.19l-1.303 2.636a1 1 0 0 1-1.608.26l-.082-.094l-.072-.11l-1.968-3.407a9 9 0 0 0 6.93-3.999m-8.066 3.999L9.464 21.39a1 1 0 0 1-1.622.157l-.076-.1l-.064-.114l-1.304-2.635l-2.931.19a1 1 0 0 1-1.022-1.29l.04-.107l.05-.1l1.968-3.409a9 9 0 0 0 6.927 4.001zM12 2l.24.004A7 7 0 0 1 19 9l-.003.193l-.007.192l-.018.245l-.026.242l-.024.178a7 7 0 0 1-.317 1.268l-.116.308l-.153.348a7.001 7.001 0 0 1-12.688-.028l-.13-.297l-.052-.133l-.08-.217l-.095-.294a7 7 0 0 1-.093-.344l-.06-.271l-.049-.271l-.02-.139l-.039-.323l-.024-.365L5 9a7 7 0 0 1 6.76-6.996z\"/>" }} />,
  },
  {
    id: "sparkles",
    label: "Parıltı",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M16 19a1 1 0 0 1 0-2a1 1 0 0 0 1-1c0-1.333 2-1.333 2 0a1 1 0 0 0 1 1c1.333 0 1.333 2 0 2a1 1 0 0 0-1 1c0 1.333-2 1.333-2 0a1 1 0 0 0-1-1M3 11a5 5 0 0 0 5-5c0-1.333 2-1.333 2 0a5 5 0 0 0 5 5c1.333 0 1.333 2 0 2a5 5 0 0 0-5 5a1 1 0 0 1-2 0a5 5 0 0 0-5-5c-1.333 0-1.333-2 0-2m13-4a1 1 0 0 1 0-2a1 1 0 0 0 1-1c0-1.333 2-1.333 2 0a1 1 0 0 0 1 1c1.333 0 1.333 2 0 2a1 1 0 0 0-1 1c0 1.333-2 1.333-2 0a1 1 0 0 0-1-1\"/>" }} />,
  },
  {
    id: "thumb-up",
    label: "Beğeni",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M13 3a3 3 0 0 1 2.995 2.824L16 6v4h2a3 3 0 0 1 2.98 2.65l.015.174L21 13l-.02.196l-1.006 5.032c-.381 1.626-1.502 2.796-2.81 2.78L17 21H9a1 1 0 0 1-.993-.883L8 20l.001-9.536a1 1 0 0 1 .5-.865a3 3 0 0 0 1.492-2.397L10 7V6a3 3 0 0 1 3-3m-8 7a1 1 0 0 1 .993.883L6 11v9a1 1 0 0 1-.883.993L5 21H4a2 2 0 0 1-1.995-1.85L2 19v-7a2 2 0 0 1 1.85-1.995L4 10z\"/>" }} />,
  },
  {
    id: "map-pin",
    label: "Konum",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M18.364 4.636a9 9 0 0 1 .203 12.519l-.203.21l-4.243 4.242a3 3 0 0 1-4.097.135l-.144-.135l-4.244-4.243A9 9 0 0 1 18.364 4.636M12 8a3 3 0 1 0 0 6a3 3 0 0 0 0-6\"/>" }} />,
  },
  {
    id: "truck",
    label: "Kamyon",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M13 4a1 1 0 0 1 1 1h4a1 1 0 0 1 .783.378l.074.108l3 5l.055.103l.04.107l.029.109l.016.11L22 11v6a1 1 0 0 1-1 1h-1.171a3.001 3.001 0 0 1-5.658 0H9.829a3.001 3.001 0 0 1-5.658 0H3a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2zM7 16a1 1 0 1 0 0 2a1 1 0 0 0 0-2m10 0a1 1 0 1 0 0 2a1 1 0 0 0 0-2m.434-9H14v3h5.234z\"/>" }} />,
  },
  {
    id: "flower",
    label: "Çiçek",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M12 1a4 4 0 0 1 4 4l-.002.055l.03-.018a3.97 3.97 0 0 1 2.79-.455l.237.056a3.97 3.97 0 0 1 2.412 1.865a4.01 4.01 0 0 1-1.455 5.461l-.068.036l.071.039a4.01 4.01 0 0 1 1.555 5.27l-.101.186a3.97 3.97 0 0 1-5.441 1.468l-.03-.02L16 19a4 4 0 0 1-3.8 3.995L12 23a4 4 0 0 1-4-4l.001-.056l-.029.019a3.97 3.97 0 0 1-2.79.456l-.236-.056a3.97 3.97 0 0 1-2.413-1.865a4.01 4.01 0 0 1 1.453-5.46l.07-.038l-.071-.038a4.01 4.01 0 0 1-1.555-5.27l.1-.187a3.97 3.97 0 0 1 5.444-1.468L8 5.055V5a4 4 0 0 1 3.8-3.995zm0 8a3 3 0 1 0 0 6a3 3 0 0 0 0-6\"/>" }} />,
  },
  {
    id: "hexagon",
    label: "Altıgen",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M10.425 1.414L3.65 5.41A3.21 3.21 0 0 0 2 8.217v7.285a3.23 3.23 0 0 0 1.678 2.826l6.695 4.237c1.034.57 2.22.57 3.2.032l6.804-4.302c.98-.537 1.623-1.618 1.623-2.793V8.218l-.005-.204a3.22 3.22 0 0 0-1.284-2.39l-.107-.075l-.007-.007a1 1 0 0 0-.181-.133L13.64 1.414a3.33 3.33 0 0 0-3.216 0z\"/>" }} />,
  },
  {
    id: "droplet",
    label: "Damla",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M10.708 2.372a2.4 2.4 0 0 0-.71.686l-4.892 7.26c-1.981 3.314-1.22 7.466 1.767 9.882c2.969 2.402 7.286 2.402 10.254 0c2.987-2.416 3.748-6.569 1.795-9.836l-4.919-7.306c-.722-1.075-2.192-1.376-3.295-.686\"/>" }} />,
  },
  {
    id: "paw",
    label: "Pati",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<g fill=\"currentColor\"><path d=\"M12 10c-1.32 0-1.983.421-2.931 1.924l-.244.398l-.395.688l-.141.254c-.24.434-.571.753-1.139 1.142l-.55.365c-.94.627-1.432 1.118-1.707 1.955c-.124.338-.196.853-.193 1.28C4.7 19.693 5.898 21 7.5 21l.242-.006c.119-.006.234-.017.354-.034l.248-.043l.132-.028l.291-.073l.162-.045l.57-.17l.763-.243l.455-.136c.53-.15.94-.222 1.283-.222c.344 0 .753.073 1.283.222l.455.136l.764.242l.569.171l.312.084q.145.036.273.062l.248.043c.12.017.235.028.354.034L16.5 21c1.602 0 2.8-1.307 2.8-3c0-.427-.073-.939-.207-1.306c-.236-.724-.677-1.223-1.48-1.83l-.257-.19l-.528-.38c-.642-.47-1.003-.826-1.253-1.278l-.27-.485l-.252-.432C14.042 10.403 13.435 10 12 10m7.78-3h-.03c-1.219.02-2.35 1.066-2.908 2.504c-.69 1.775-.348 3.72 1.075 4.333c.256.109.527.163.801.163c1.231 0 2.38-1.053 2.943-2.504c.686-1.774.34-3.72-1.076-4.332A2.05 2.05 0 0 0 19.781 7zM9.025 3c-.112 0-.185.002-.27.015l-.093.016C7.13 3.237 6.265 5.02 6.554 6.886C6.826 8.611 8.016 10 9.474 10l.187-.005l.084-.01l.092-.016c1.533-.206 2.397-1.989 2.108-3.855C11.675 4.387 10.485 3 9.025 3\"/><path d=\"M14.972 3c-1.459 0-2.647 1.388-2.916 3.113c-.29 1.867.574 3.65 2.174 3.867q.153.02.296.02c1.39 0 2.543-1.265 2.877-2.883l.041-.23c.29-1.867-.574-3.65-2.174-3.867a2 2 0 0 0-.298-.02M4.217 7c-.274 0-.544.054-.797.161c-1.426.615-1.767 2.562-1.078 4.335C2.905 12.947 4.052 14 5.283 14c.274 0 .544-.054.797-.161c1.426-.615 1.767-2.562 1.078-4.335C6.595 8.053 5.448 7 4.217 7\"/></g>" }} />,
  },
  {
    id: "rosette",
    label: "Madalya",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M12.01 2.011a3.2 3.2 0 0 1 2.113.797l.154.145l.698.698a1.2 1.2 0 0 0 .71.341L15.82 4h1a3.2 3.2 0 0 1 3.195 3.018l.005.182v1c0 .27.092.533.258.743l.09.1l.697.698a3.2 3.2 0 0 1 .147 4.382l-.145.154l-.698.698a1.2 1.2 0 0 0-.341.71l-.008.135v1a3.2 3.2 0 0 1-3.018 3.195l-.182.005h-1a1.2 1.2 0 0 0-.743.258l-.1.09l-.698.697a3.2 3.2 0 0 1-4.382.147l-.154-.145l-.698-.698a1.2 1.2 0 0 0-.71-.341L8.2 20.02h-1a3.2 3.2 0 0 1-3.195-3.018L4 16.82v-1a1.2 1.2 0 0 0-.258-.743l-.09-.1l-.697-.698a3.2 3.2 0 0 1-.147-4.382l.145-.154l.698-.698a1.2 1.2 0 0 0 .341-.71L4 8.2v-1l.005-.182a3.2 3.2 0 0 1 3.013-3.013L7.2 4h1a1.2 1.2 0 0 0 .743-.258l.1-.09l.698-.697a3.2 3.2 0 0 1 2.269-.944\"/>" }} />,
  },
  {
    id: "circle-check",
    label: "Onay",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32\"/>" }} />,
  },
  {
    id: "shopping-cart",
    label: "Sepet",
    category: "icon",
    viewBox: "0 0 24 24",
    recolorable: true,
    markup: <g dangerouslySetInnerHTML={{ __html: "<path fill=\"currentColor\" d=\"M6 2a1 1 0 0 1 .993.883L7 3v1.068l13.071.935A1 1 0 0 1 21 6.027l-.01.114l-1 7a1 1 0 0 1-.877.853L19 14H7v2h10a3 3 0 1 1-2.995 3.176L14 19l.005-.176q.027-.433.166-.824H8.829a3 3 0 1 1-5.824 1.176L3 19l.005-.176A3 3 0 0 1 5 16.17V4H4a1 1 0 0 1-.993-.883L3 3a1 1 0 0 1 .883-.993L4 2zm0 16a1 1 0 1 0 0 2a1 1 0 0 0 0-2m11 0a1 1 0 1 0 0 2a1 1 0 0 0 0-2\"/>" }} />,
  },
]

export const getLibraryElement = (id: string): LibraryElement | undefined =>
  ELEMENT_LIBRARY.find((entry) => entry.id === id)
