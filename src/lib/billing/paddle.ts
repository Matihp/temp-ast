import { client, createTransaction } from "paddle-billing"

export const getPaddleClient = (apiKey: string, sandbox = false) => client(apiKey, sandbox)

export const createCheckoutTransaction = async (
  apiKey: string,
  items: { priceId: string; quantity: number }[],
  sandbox = false
) => {
  const paddle = getPaddleClient(apiKey, sandbox)
  const body = {
    items: items.map((i) => ({ price_id: i.priceId, quantity: i.quantity })),
  } as any
  const tx = await createTransaction(paddle, body)
  return tx
}
