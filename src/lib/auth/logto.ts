import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

export type VerifyResult = {
  payload: JWTPayload
}

const fetchOpenIdConfig = async (issuerEndpoint: string) => {
  const url = new URL("/oidc/.well-known/openid-configuration", issuerEndpoint)
  const res = await fetch(url, { headers: { "content-type": "application/json" } })
  const json = (await res.json()) as { jwks_uri: string; issuer: string }
  const jwksUri = json.jwks_uri
  const issuer = json.issuer
  return { jwksUri, issuer }
}

export const verifyAccessToken = async (
  token: string,
  issuerEndpoint: string,
  resourceIndicator: string,
  requiredScopes: string[] = []
): Promise<VerifyResult> => {
  const { jwksUri, issuer } = await fetchOpenIdConfig(issuerEndpoint)
  const JWKS = createRemoteJWKSet(new URL(jwksUri))
  const { payload } = await jwtVerify(token, JWKS, { issuer })

  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : []
  if (!audiences.includes(resourceIndicator)) throw new Error("invalid_audience")

  const scopes = (payload.scope as string)?.split(" ") ?? []
  if (!requiredScopes.every((s) => scopes.includes(s))) throw new Error("insufficient_scope")

  return { payload }
}
