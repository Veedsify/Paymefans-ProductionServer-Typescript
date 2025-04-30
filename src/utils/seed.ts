import { PrismaClient } from '@prisma/client'
import { CreateHashedPassword } from '../libs/HashPassword'
import { currencyRates } from './currency-rates';
import { pointSeeding } from './seeders/createPoints';
import { GenerateUniqueId } from './GenerateUniqueId';
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

  await prisma.platformExchangeRate.createMany({
    data: currencyRates.map((rate) => ({
      rate: rate.rate,
      name: rate.currency,
      value: rate.value,
    }))
  })

  for (let point of pointSeeding) {
    await prisma.globalPointsBuy.create({
      data: {
        points_buy_id: point.id,
        points: point.points,
        amount: point.amount,
        currency: point.currency,
        conversion_rate: point.conversion_rate,
      },
    });
  }

  await prisma.outerPages.createMany({
    data: [
      {
        title: "Privacy Policy",
        page_id: GenerateUniqueId(),
        slug: "privacy-policy",
        content: "privacy_policy"
      },
      {
        title: "Terms and Conditions",
        page_id: GenerateUniqueId(),
        slug: "terms-and-conditions",
        content: "terms_and_conditions"
      },
    ]
  })

}


main()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
