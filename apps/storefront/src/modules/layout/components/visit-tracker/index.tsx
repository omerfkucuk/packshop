"use client"

import { useEffect } from "react"

import { recordVisit } from "@lib/data/customer"


// Rendered only for logged-in customers. The backend already writes at most
// once per day; the localStorage day check just avoids a request on every
// full page load.
const VisitTracker = ({ customerId }: { customerId: string }) => {
  useEffect(() => {
    const storageKey = `packshop_last_visit_ping:${customerId}`
    const today = new Date().toDateString()
    try {
      if (localStorage.getItem(storageKey) === today) {
        return
      }
    } catch {
      // storage unavailable - just ping
    }
    // Mark the day only after the backend accepted it, so a failed ping
    // (backend down/deploying) is retried on the next page load.
    recordVisit().then((ok) => {
      if (!ok) return
      try {
        localStorage.setItem(storageKey, today)
      } catch {
        // ignore
      }
    })
  }, [customerId])

  return null
}

export default VisitTracker
