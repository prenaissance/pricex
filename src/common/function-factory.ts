import { app, output, TimerHandler } from "@azure/functions";
import { ProductCrawler } from "./product-crawler";

const queueOutput = output.storageQueue({
  connection: "AzureWebJobsStorage",
  queueName: "pricex",
});

const blobOutput = output.storageBlob({
  connection: "AzureWebJobsStorage",
  path: "products/{name}/{date}.json",
});

export const registerTimerCrawler = (crawler: ProductCrawler) => {
  app.timer(crawler.name, {
    schedule: "0 */2 * * * *",
    extraOutputs: [queueOutput, blobOutput],

    handler: async (timer, ctx) => {
      await crawler.crawl();
      const blobBody = await crawler.dataset.getData();
      ctx.extraOutputs.set(blobOutput, blobBody);
      ctx.log(timer.scheduleStatus);
      ctx.extraOutputs.set(queueOutput, {
        name: crawler.name,
        blobPath: "products/{name}/{date}.json",
      });
    },
  });
};
