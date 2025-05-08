import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import type {
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
      const cacheKey = `products:${page}:${limit}`;
      const cachedProducts = await new Promise<string | null>(
        (resolve, reject) => {
          redis.get(cacheKey, (err, reply) => {
            if (err) return reject(err);
            resolve(reply as string | null);
          });
        }
      );

      if (cachedProducts) {
        return JSON.parse(cachedProducts) as StoreAllProductsResponse;
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

      const productsWithModifyImageUrl = products.map((product) => {
        const modifiedImages = product.images.map((image) => {
          return {
            ...image,
            image_url: `${process.env.AWS_CLOUDFRONT_URL}/${image.image_url}`,
          };
        });

        return {
          ...product,
          images: modifiedImages,
        };
      })

      const response = {
        error: false,
        hasMore,
        perPage: Number(limit),
        totalProducts: countProducts,
        message: "Products fetched successfully",
        data: productsWithModifyImageUrl,
      };

      // Cache the products for 60 seconds
      redis.set(cacheKey, JSON.stringify(response), "EX", 60);

      return response;
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


      const modifiedProductDetails = {
        ...productDetails,
        images: productDetails.images.map((image) => {
          return {
            ...image,
            image_url: `${process.env.AWS_CLOUDFRONT_URL}/${image.image_url}`,
          };
        }),
      };

      return {
        error: false,
        message: "Product fetched successfully",
        status: 200,
        data: modifiedProductDetails,
      };
    } catch (error: any) {
      console.error("Error fetching product details:", error);
      throw new Error("An error occurred while fetching product details");
    }
  }
}
