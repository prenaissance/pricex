import {
  app,
  output,
  TimerHandler,
  StorageBlobOutput,
  StorageBlobOutputOptions,
} from "@azure/functions";
import darwin from "@/crawlers/darwin";

const queueOutput = output.storageQueue({
  connection: "AzureWebJobsStorage",
  queueName: "pricex",
});

const blobOutput = output.storageBlob({
  connection: "AzureWebJobsStorage",
  path: "products/{name}/{date}.json",
});

export const darwinHandler: TimerHandler = async (timer, ctx) => {
  await darwin.crawler.run();
};

app.timer("darwin", {
  schedule: "0 */5 * * * *",
  extraOutputs: [queueOutput, blobOutput],
  handler: async (timer, ctx) => {
    await darwin.crawler.run();
    const blobBody = JSON.stringify(await darwin.dataset.getData());
    ctx.extraOutputs.set(blobOutput);
  },
});
