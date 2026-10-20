// Bare layout for printable documents (the cart quote) - no nav/footer, so
// "PDF olarak kaydet" prints only the document.
export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black/[0.04] print:bg-white">{children}</div>
}
