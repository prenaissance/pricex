import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

export const name = "xstore";
export const baseUrl = "https://xstore.md/";

const requestList = await RequestList.open(name, [
  { url: baseUrl, label: "home" },
]);
const requestQueue = await RequestQueue.open(name);
await requestQueue.addRequest({ url: baseUrl, label: "home" });
const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new JSDOMCrawler({
  requestList,
  requestQueue,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log }) => {
  log.info(`enqueueing categories URLs on ${baseUrl}`);
  await enqueueLinks({
    selector: ".xcategorys a.xcateg",
    requestQueue,
  });
});

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(
    `scraping products on Xstore on page ${
      window.location.pathname + window.location.search
    }`,
  );

  await enqueueLinks({
    selector: ".pag a",
    requestQueue,
    globs: ["https://xstore.md/**/*\\?page=*"],
    exclude: ["https://xstore.md/**/*\\?page=1"],
  });

  const $items = window.document.querySelectorAll(".card-product");

  for (const $item of $items) {
    const $anchor = $item.querySelector("a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;
    const imageUrl = new URL($anchor.querySelector("img")!.src, baseUrl).href;

    const $cardContent = $item.querySelector(".card-xt")!;
    const name = normalizeString(
      $cardContent.querySelector(".xp-title")!.textContent!,
    );
    const description = $cardContent.querySelector(".xp-attrs")?.textContent
      ? normalizeString($cardContent.querySelector(".xp-attrs")!.textContent!)
      : undefined;
    const price = getDecimalPrice(
      $cardContent.querySelector(".xprice")?.textContent ?? "",
    );
    if (!price) {
      log.warning(`Invalid price for ${name} on Xstore`);
      continue;
    }

    await dataset.pushData({
      name,
      url,
      imageUrl,
      description,
      price,
      currency: "MDL",
      storeName: name,
    });
  }
});

export default new ProductCrawler({ crawler, dataset, name });
