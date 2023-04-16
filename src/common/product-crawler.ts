import { Dataset, type BasicCrawler } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import dotenv from "dotenv";
dotenv.config();

export class ProductCrawler {
  readonly crawler: BasicCrawler<any>;
  readonly name: string;
  readonly dataset: Dataset<ProductInfo>;
  constructor(options: {
    crawler: BasicCrawler<any>;
    name: string;
    dataset: Dataset<ProductInfo>;
  }) {
    this.crawler = options.crawler;
    this.name = options.name;
    this.dataset = options.dataset;
  }

  async crawl() {
    await this.crawler.run();
  }
}
