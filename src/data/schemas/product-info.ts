export default interface ProductInfo {
  name: string;
  description?: string;
  url: string;
  price: number;
  currency: string;
  storeName: string;
  imageUrl?: string;
  sku?: string;
}
