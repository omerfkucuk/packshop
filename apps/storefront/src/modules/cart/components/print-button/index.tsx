"use client"

// The browser's print dialog offers "PDF olarak kaydet" - no PDF library
// needed, and the (quote) layout keeps nav/footer out of the output.
const PrintButton = () => (
  <button
    type="button"
    onClick={() => window.print()}
    className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/85 transition-colors"
    data-testid="quote-print-button"
  >
    PDF olarak indir
  </button>
)

export default PrintButton
