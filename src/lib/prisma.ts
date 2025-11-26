import { PrismaClient } from "@prisma/client/edge"
import { withAccelerate } from "@prisma/extension-accelerate"

export const getDb = (databaseUrl: string) => {
  const client = new PrismaClient({
    datasourceUrl: databaseUrl,
  }).$extends(withAccelerate())
  return client
}
