export type StoreProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  instock: number;
  product_id: string;
  category: {
    name: string;
  };
  images: {
    id: number;
    image_url: string;
  }[];
  sizes: {
    size: {
      name: string;
    };
  }[];
};
export type StoreSingleProductResponse = {
  error: boolean;
  message: string;
  status: number;
  data: StoreProduct | null;
};


export type StoreAllProductsResponse = {
      error: boolean;
      message: string;
      totalProducts: number;
      hasMore: boolean;
      data: StoreProduct[];
}

export type AllProductProps = {
      page: string;
      limit: string;
}
