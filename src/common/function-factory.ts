import { app, output } from "@azure/functions";
import { ContainerClient } from "@azure/storage-blob";
import dotenv from "dotenv";

import { ProductCrawler } from "./product-crawler";

dotenv.config();

const containerClient = new ContainerClient(
  process.env.STORAGE_ACCOUNT_CONNECTION_STRING,
  "products",
);

const queueOutput = output.storageQueue({
  connection: "AzureWebJobsStorage",
  queueName: "pricex",
});

export const registerTimerCrawler = (crawler: ProductCrawler) => {
  app.timer(crawler.name, {
    schedule: "0 0 */12 * * *",
    extraOutputs: [queueOutput],

    handler: async (_, ctx) => {
      const date = new Date().toISOString();
      const blobPath = `${crawler.name}/${date}.json`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

      await crawler.crawl();
      const blobBody = JSON.stringify(await crawler.dataset.getData());
      await blockBlobClient.upload(blobBody, blobBody.length, {
        blobHTTPHeaders: {
          blobContentType: "application/json",
        },
      });
      ctx.extraOutputs.set(queueOutput, {
        name: crawler.name,
        blobPath,
        retries: 0,
      });
    },
  });
};
