import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const plans = [
  {
    priceId: "pri_demo_basic",
    name: "Básico",
    features: { ai_basic: true },
    isActive: true,
  },
  {
    priceId: "pri_demo_pro",
    name: "Pro",
    features: { ai_pro: true, priority_support: true },
    isActive: true,
  },
]

async function main() {
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { priceId: p.priceId },
      update: { name: p.name, features: p.features, isActive: p.isActive },
      create: { priceId: p.priceId, name: p.name, features: p.features, isActive: p.isActive },
    })
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
