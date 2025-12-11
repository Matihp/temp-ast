import { useEffect, useState } from "react"

type Me = {
  authenticated: boolean
  hasActiveSubscription: boolean
  features: Record<string, any>
  user: { id: string; authId: string; email: string; name?: string | null }
}

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
  requireActive?: boolean
  requiredFeature?: string | string[]
  mode?: "any" | "all"
}

export default function FeatureGate({
  children,
  fallback = null,
  loading = null,
  requireActive = true,
  requiredFeature,
  mode = "any",
}: Props) {
  const [me, setMe] = useState<Me | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const res = await fetch("/api/me", { headers: { "cache-control": "no-store" } })
        const raw = res.ok ? await res.json() : null
        const isMe = (x: any): x is Me => !!x && typeof x === "object" &&
          typeof x.authenticated === "boolean" && typeof x.hasActiveSubscription === "boolean" &&
          x.user && typeof x.user === "object" && typeof x.user.id === "string" && typeof x.user.authId === "string"
        const data = isMe(raw) ? raw : null
        if (mounted) setMe(data)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) return <>{loading}</>

  const hasActive = requireActive ? !!me?.hasActiveSubscription : true
  const features = me?.features ?? {}
  const req = !requiredFeature
    ? []
    : Array.isArray(requiredFeature)
    ? requiredFeature
    : [requiredFeature]
  const featureOk = req.length
    ? mode === "all"
      ? req.every((k) => !!features[k])
      : req.some((k) => !!features[k])
    : true

  const allowed = hasActive && featureOk
  return <>{allowed ? children : fallback}</>
}
