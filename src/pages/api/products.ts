import type { APIRoute } from "astro"
import { getDb } from "@/lib/prisma"

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime

  // NOTE: In a real app, you should add authentication here to protect this endpoint.
  // For now, we assume it's called from a trusted local script.

  try {
    const body = await request.json() as any
    const { name, brand, price, size, color, type, gender, url, imageUrl } = body

    if (!url || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields: url, name" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const db = getDb(runtime.env.DATABASE_URL as string)

    try {
      const product = await db.product.upsert({
        where: { url },
        create: {
          name,
          brand,
          price: typeof price === 'string' ? parseFloat(price) : price,
          size,
          color,
          type,
          gender,
          url,
          imageUrl,
        },
        update: {
          name,
          brand,
          price: typeof price === 'string' ? parseFloat(price) : price,
          size,
          color,
          type,
          gender,
          imageUrl,
          scrapedAt: new Date(),
        },
      })

      return new Response(JSON.stringify({ success: true, product }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    } finally {
      await db.$disconnect()
    }
  } catch (error) {
    console.error("Error saving product:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}
