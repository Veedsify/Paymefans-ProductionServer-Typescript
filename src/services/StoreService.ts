import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import type{
  AllProductProps,
  StoreAllProductsResponse,
  StoreSingleProductResponse,
} from "types/store";

export default class StoreService {
  static async AllProducts({
    page = "1",
    limit = "10",
  }: AllProductProps): Promise<StoreAllProductsResponse> {
    try {
      // Wrap redis.get in a Promise
      const cachedProducts = await new Promise<string | null>(
        (resolve, reject) => {
          redis.get("products", (err, reply) => {
            if (err) return reject(err);
            resolve(reply as string | null);
          });
        }
      );

      if (cachedProducts) {
        return JSON.parse(cachedProducts);
      }

      const countProducts = await query.product.count();

      const products = await query.product.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          instock: true,
          product_id: true,
          category: {
            select: {
              name: true,
            },
          },
          images: {
            select: {
              id: true,
              image_url: true,
            },
          },
          sizes: {
            select: {
              size: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit) + 1,
        orderBy: {
          id: "desc",
        },
      });

      let hasMore = false;
      if (products.length > Number(limit)) {
        hasMore = true;
        products.pop(); // Remove the last item to fit the limit
      }

      // Cache the products for 60 seconds
      redis.set("products", JSON.stringify(products), "EX", 60);
      return {
        error: false,
        hasMore,
        totalProducts: countProducts,
        message: "Products fetched successfully",
        data: products,
      };
    } catch (error: any) {
      console.error("Error fetching products:", error);
      throw new Error("An error occurred while fetching products");
    }
  }

  static async SingleProduct(
    productId: string
  ): Promise<StoreSingleProductResponse> {
    // Check if the productId is valid
    try {
      const productDetails = await query.product.findUnique({
        where: {
          product_id: productId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          instock: true,
          product_id: true,
          category: {
            select: {
              name: true,
            },
          },
          images: {
            select: {
              id: true,
              image_url: true,
            },
          },
          sizes: {
            select: {
              size: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!productDetails) {
        return {
          error: true,
          message: "Product not found",
          status: 404,
          data: null,
        };
      }

      return {
        error: false,
        message: "Product fetched successfully",
        status: 200,
        data: productDetails,
      };
    } catch (error: any) {
      console.error("Error fetching product details:", error);
      throw new Error("An error occurred while fetching product details");
    }
  }
}
