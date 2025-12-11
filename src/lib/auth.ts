import { createRemoteJWKSet, jwtVerify } from "jose"

export const verifyAccessToken = async (
  token: string,
  issuer: string,
  audience: string
) => {
  const jwks = createRemoteJWKSet(new URL(`${issuer}/oidc/jwks`))
  const { payload } = await jwtVerify(token, jwks, { issuer, audience })
  return payload
}
