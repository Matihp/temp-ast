import type { APIRoute } from "astro"
import { parseWebhookBody } from "paddle-billing/webhooks"

export const POST: APIRoute = async ({ request, locals }) => {
  const signature = request.headers.get("paddle-signature")
  if (!signature) return new Response("Bad Request", { status: 400 })
  const body = await request.text()
  const secret = (locals as any).runtime.env.PADDLE_WEBHOOK_SECRET as string
  const webhook = parseWebhookBody(null, secret, signature, body)
  if (!webhook) return new Response("Invalid", { status: 400 })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}
