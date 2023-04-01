import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";

export const name = "cosmo";
export const baseUrl = "https://www.cosmo.md/";

const requestList = await RequestList.open(name, [
  { url: baseUrl, label: "home" },
]);
const requestQueue = await RequestQueue.open(name);
const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new JSDOMCrawler({
  requestList,
  requestQueue,
  maxRequestsPerCrawl: 200,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log }) => {
  log.info(`enqueueing categories URLs on ${baseUrl}`);
  await enqueueLinks({
    selector: "#menu-vertical-list a",
    label: "category",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addHandler("category", async ({ enqueueLinks, log, window }) => {
  log.info(`enqueueing Cosmo subcategories in ${window.location.pathname}`);
  await enqueueLinks({
    selector: "#content a.sw-title",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(`scraping products on Cosmo on page ${window.location.pathname}`);
  await enqueueLinks({
    selector: ".pagination a",
    requestQueue,
    globs: [`${baseUrl}/**/*\\?page=*`],
    exclude: [`${baseUrl}/**/*\\?page=1`],
    baseUrl,
  });

  const $items = window.document.querySelectorAll(".product-thumb");

  for (const $item of $items) {
    const $anchor = $item.querySelector(".image a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;
    const $image = $anchor.querySelector("img")!;
    const imageUrl = $image.src;
    const name = normalizeString($image.title);
    const price = getDecimalPrice($item.querySelector(".price")!.textContent!);
    if (price === null) {
      log.warning(`Invalid price for ${name} on Cosmo`);
      continue;
    }

    await dataset.pushData({
      url,
      name,
      imageUrl,
      price,
      currency: "MDL",
      storeName: name,
    });
  }
});

export default crawler;
