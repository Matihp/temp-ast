import { useEffect, useState } from "react"

type Me = {
  user?: { email?: string; authId?: string }
}

type DefaultPlanResponse = { priceId: string; name?: string }

type Props = { label?: string; quantity?: number }

export default function CheckoutCta({ label = "Comprar", quantity = 1 }: Props) {
  const [Paddle, setPaddle] = useState<any>(null)
  const [priceId, setPriceId] = useState<string | null>(null)
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [{ loadScript }, plansRes, meRes] = await Promise.all([
          import("paddle-billing/web"),
          fetch("/api/plans/default", { headers: { "cache-control": "no-store" } }),
          fetch("/api/me", { headers: { "cache-control": "no-store" } }),
        ])
        const P = await loadScript()
        const planRaw: unknown = plansRes.ok ? await plansRes.json() : null
        const meRaw: unknown = meRes.ok ? await meRes.json() : null
        const isPlan = (x: any): x is DefaultPlanResponse => !!x && typeof x === "object" && typeof x.priceId === "string"
        const isMe = (x: any): x is Me => {
          if (!x || typeof x !== "object") return false
          const u = (x as any).user
          if (!u || typeof u !== "object") return false
          const emailOk = typeof (u as any).email === "string" || typeof (u as any).email === "undefined"
          const authOk = typeof (u as any).authId === "string" || typeof (u as any).authId === "undefined"
          return emailOk && authOk
        }
        const plan = isPlan(planRaw) ? planRaw : null
        const meJson = isMe(meRaw) ? meRaw : null
        if (mounted) {
          setPaddle(P)
          setPriceId(plan?.priceId ?? null)
          setMe(meJson)
        }
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  const onClick = () => {
    if (!Paddle || !priceId) return
    const email = me?.user?.email
    const authId = me?.user?.authId
    const items = [{ priceId, quantity }]
    const customData = authId ? { authId, email } : {}
    const customer = email ? { email } : undefined
    Paddle.Checkout.open({ items, customer, customData })
  }

  return (
    <button
      onClick={onClick}
      className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
    >
      {label}
    </button>
  )
}
