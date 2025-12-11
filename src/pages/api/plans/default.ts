import type { APIRoute } from "astro"
import { getDb } from "../../../lib/prisma"

export const GET: APIRoute = async ({ locals }) => {
  const runtime = (locals as any).runtime
  const db = getDb(runtime.env.DATABASE_URL as string)
  try {
    const plan = await db.plan.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } })
    if (!plan) return new Response(JSON.stringify({ error: "no_active_plan" }), { status: 404 })
    return new Response(JSON.stringify({ priceId: plan.priceId, name: plan.name }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    })
  } finally {
    await db.$disconnect()
  }
}
