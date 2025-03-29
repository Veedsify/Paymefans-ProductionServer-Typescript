import StoreService from "@services/StoreService";
import { Request, Response } from "express";

export default class StoreController {
  static async GetProducts(req: Request, res: Response) {
    const products = await StoreService.AllProducts({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    if (products.error) {
      res.status(500).json({
        status: false,
        message: "An error occurred while fetching products",
        error: products.error,
      });
      return;
    }

    res.status(200).json(products);
  }

  static async GetSingleProduct(req: Request, res: Response) {
    try {
      const { product_id } = req.params;
      const productDetails = await StoreService.SingleProduct(product_id);
      if (productDetails.error) {
        res.status(404).json({
          status: false,
          message: "Product not found",
        });
        return;
      }

      res.status(200).json(productDetails);
    } catch (err: any) {
      console.error("Error fetching product details:", err);
      res.status(500).json({
        status: false,
        message: "An error occurred while fetching product details",
        error: err.message,
      });
    }
  }
}
