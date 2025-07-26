export type CartItem = {
    product_id: string;
    quantity: number;
    size_id?: number;
};

export type AddToCartProps = {
    product_id: string;
    quantity: number;
    size_id?: number;
};

export type UpdateCartItemProps = {
    product_id: string;
    quantity: number;
    size_id?: number;
};

export type CartResponse = {
    error: boolean;
    message: string;
    data?: any;
};

export type CheckoutProps = {
    items: CartItem[];
    shipping_address: {
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        country: string;
    };
    payment_method: 'paystack';
};

export type CheckoutResponse = {
    error: boolean;
    message: string;
    data?: {
        order_id: string;
        payment_url?: string;
        reference?: string;
        total_amount: number;
    };
};

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
    id: number;
    order_id: string;
    user_id: number;
    total_amount: number;
    status: OrderStatus;
    payment_status: 'pending' | 'paid' | 'failed';
    payment_reference?: string;
    shipping_address: any;
    created_at: Date;
    updated_at: Date;
    items: OrderItem[];
};

export type OrderItem = {
    id: number;
    order_id: string;
    product_id: string;
    quantity: number;
    price: number;
    size_id?: number;
    product: {
        name: string;
        images: { image_url: string }[];
    };
    size?: {
        name: string;
    };
};