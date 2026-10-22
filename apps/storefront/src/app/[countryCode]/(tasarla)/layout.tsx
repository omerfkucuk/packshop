export default function TasarlaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Pinned to the visible viewport (dvh, not vh - mobile browser bars made
  // 100vh taller than the screen, so the whole editor could scroll) with
  // overscroll disabled: only the step panel scrolls, never the view.
  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden overscroll-none">
      {children}
    </div>
  )
}
