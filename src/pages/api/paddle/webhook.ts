import type { APIRoute } from "astro"
import { parseWebhookBody } from "paddle-billing/webhooks"
import { getDb } from "../../../lib/prisma"

export const POST: APIRoute = async ({ request, locals }) => {
  const signature = request.headers.get("paddle-signature") || ""
  const body = await request.text()
  const runtime = (locals as any).runtime
  const secret = runtime.env.PADDLE_WEBHOOK_SECRET as string
  const webhook = parseWebhookBody(null, secret, signature, body)
  if (!webhook) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }

  const db = getDb(runtime.env.DATABASE_URL as string)

  try {
    switch (webhook.event_type) {
      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.paused":
      case "subscription.resumed":
      case "subscription.past_due":
      case "subscription.trialing":
      case "subscription.canceled": {
        const s = webhook.data
        let user = await db.user.findFirst({ where: { paddleCustomerId: s.customer_id } })
        if (!user && s.custom_data && typeof s.custom_data === "object") {
          const authId = (s.custom_data as any).authId as string | undefined
          const email = (s.custom_data as any).email as string | undefined
          if (authId) user = await db.user.findUnique({ where: { authId } })
          if (!user && email) user = await db.user.findUnique({ where: { email } })
          if (user && !user.paddleCustomerId) {
            await db.user.update({ where: { id: user.id }, data: { paddleCustomerId: s.customer_id } })
          }
        }
        if (!user) break
        const priceId = s.items[0]?.price.id
        const plan = priceId ? await db.plan.findUnique({ where: { priceId } }) : null
        const period = s.current_billing_period
        if (plan) {
          await db.subscription.upsert({
            where: { paddleSubscriptionId: s.id },
            create: {
              paddleSubscriptionId: s.id,
              userId: user.id,
              planId: plan.id,
              status: s.status,
              currentPeriodStart: period?.starts_at ? new Date(period.starts_at) : new Date(),
              currentPeriodEnd: period?.ends_at ? new Date(period.ends_at) : new Date(),
              cancelAtPeriodEnd: s.scheduled_change?.action === "cancel",
            },
            update: {
              status: s.status,
              currentPeriodStart: period?.starts_at ? new Date(period.starts_at) : undefined,
              currentPeriodEnd: period?.ends_at ? new Date(period.ends_at) : undefined,
              cancelAtPeriodEnd: s.scheduled_change?.action === "cancel",
              plan: plan ? { connect: { id: plan.id } } : undefined,
            },
          })
        } else {
          await db.subscription.update({
            where: { paddleSubscriptionId: s.id },
            data: {
              status: s.status,
              currentPeriodStart: period?.starts_at ? new Date(period.starts_at) : undefined,
              currentPeriodEnd: period?.ends_at ? new Date(period.ends_at) : undefined,
              cancelAtPeriodEnd: s.scheduled_change?.action === "cancel",
            },
          }).catch(() => {})
        }
        break
      }
      case "transaction.paid":
      case "transaction.completed": {
        const t = webhook.data
        if (!t.subscription_id) break
        const subs = await db.subscription.findUnique({ where: { paddleSubscriptionId: t.subscription_id } })
        if (!subs) {
          let user: any = null
          if (t.custom_data && typeof t.custom_data === "object") {
            const authId = (t.custom_data as any).authId as string | undefined
            const email = (t.custom_data as any).email as string | undefined
            if (authId) user = await db.user.findUnique({ where: { authId } })
            if (!user && email) user = await db.user.findUnique({ where: { email } })
          }
          if (!user) break
          break
        }
        const existing = await db.invoice.findFirst({ where: { paddleTransactionId: t.id } })
        const amountInt = parseInt(t.details.totals.total)
        if (!existing) {
          await db.invoice.create({
            data: {
              subscriptionId: subs.id,
              paddleTransactionId: t.id,
              amount: Number.isNaN(amountInt) ? 0 : amountInt,
              currency: t.currency_code,
              status: webhook.event_type === "transaction.completed" ? "paid" : "open",
              issuedAt: t.billed_at ? new Date(t.billed_at) : new Date(),
              paidAt: webhook.event_type === "transaction.completed" ? new Date(webhook.occurred_at) : null,
            },
          })
        } else {
          await db.invoice.update({
            where: { id: existing.id },
            data: {
              status: webhook.event_type === "transaction.completed" ? "paid" : existing.status,
              paidAt: webhook.event_type === "transaction.completed" ? new Date(webhook.occurred_at) : existing.paidAt,
            },
          })
        }
        break
      }
      case "transaction.payment_failed": {
        const t = webhook.data
        if (!t.subscription_id) break
        const subs = await db.subscription.findUnique({ where: { paddleSubscriptionId: t.subscription_id } })
        if (!subs) break
        const inv = await db.invoice.findFirst({ where: { paddleTransactionId: t.id } })
        if (inv) {
          await db.invoice.update({ where: { id: inv.id }, data: { status: "open" } })
        }
        break
      }
    }
  } finally {
    await db.$disconnect()
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}
