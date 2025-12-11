import type { APIRoute } from "astro"
import { verifyAccessToken } from "../../lib/auth"
import { getDb } from "../../lib/prisma"

export const GET: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime
  const issuer = runtime.env.LOGTO_ISSUER_ENDPOINT as string
  const audience = runtime.env.LOGTO_RESOURCE_INDICATOR as string
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ||
    (request.headers.get("cookie") || "").split(";").map((c) => c.trim()).find((c) => c.startsWith("logto_access_token="))?.split("=")[1]
  if (!token) return new Response("Unauthorized", { status: 401 })

  try {
    const claims = await verifyAccessToken(token, issuer, audience)
    const authId = String(claims.sub || "")
    if (!authId) return new Response("Unauthorized", { status: 401 })

    const db = getDb(runtime.env.DATABASE_URL as string)
    const now = new Date()
    try {
      const user = await db.user.upsert({
        where: { authId },
        create: {
          authId,
          email: typeof claims.email === "string" ? claims.email : `${authId}@local`,
          name: typeof claims.name === "string" ? claims.name : null,
        },
        update: {
          email: typeof claims.email === "string" ? claims.email : undefined,
          name: typeof claims.name === "string" ? claims.name : undefined,
        },
      })

      const subscription = await db.subscription.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { plan: true },
      })

      const activeStatuses = ["active", "trialing"]
      const hasActive = !!subscription && activeStatuses.includes(subscription.status) && subscription.currentPeriodEnd > now

      const features = hasActive ? (subscription?.plan?.features as any) ?? {} : {}

      const result = {
        authenticated: true,
        user: { id: user.id, authId: user.authId, email: user.email, name: user.name },
        subscription: subscription
          ? {
              status: subscription.status,
              planId: subscription.planId,
              planName: subscription.plan?.name ?? null,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
        hasActiveSubscription: hasActive,
        features,
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      })
    } finally {
      await db.$disconnect()
    }
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }
}
