import { PrismaClient } from '@prisma/client'
import { CreateHashedPassword } from '../libs/HashPassword'
const { SERVER_ORIGINAL_URL } = process.env

const prisma = new PrismaClient()
const uniqueUserId = Math.random().toString(36).substring(2, 15);

async function main() {
  const password = await CreateHashedPassword("password")
   await prisma.user.upsert({
    where: { email: 'admin@paymefans.com' },
    update: {},
    create: {
      email: 'admin@paymefans.com',
      fullname: "Paymefans",
      name: "Paymefans",
      password,
      admin: true,
      phone: "1234567890",
      location: "Nigeria",
      role: "admin",
      profile_image: SERVER_ORIGINAL_URL + "/site/avatar.png",
      user_id: "paymefans",
      username: "@paymefans",
      UserWallet: {
        create: {
          wallet_id: uniqueUserId,
          balance: 0,
        }
      },
      UserPoints: {
        create: {
          conversion_rate: 0,
          points: 0,
        }
      },
      Settings: {
        create: {
          price_per_message: 0,
          enable_free_message: true,
          subscription_price: 0,
          subscription_duration: "1 Month",
          subscription_type: "free"
        }
      }
    },
  })
}


main()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
