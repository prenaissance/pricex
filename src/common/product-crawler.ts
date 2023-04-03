import { Dataset, type BasicCrawler } from "crawlee";
import { QueueClient } from "@azure/storage-queue";
import { ContainerClient } from "@azure/storage-blob";
import ProductInfo from "@/data/schemas/product-info";
import dotenv from "dotenv";
dotenv.config();

const queueClient = new QueueClient(
  process.env.STORAGE_ACCOUNT_CONNECTION_STRING,
  "pricex",
);

const containerClient = new ContainerClient(
  process.env.STORAGE_ACCOUNT_CONNECTION_STRING,
  "products",
);

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
    const date = new Date().toISOString();

    const blobName = `${this.name}/${date}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const datasetItems = await this.dataset.getData();

    const blobJson = JSON.stringify(await datasetItems.items);
    await blockBlobClient.upload(blobJson, blobJson.length);

    const queueMessage = JSON.stringify({
      name: this.name,
      date,
      retries: 0,
    });

    await queueClient.sendMessage(queueMessage, {
      messageTimeToLive: -1,
    });
  }
}
