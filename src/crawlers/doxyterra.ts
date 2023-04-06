import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "doxyterra";
const baseUrl = "https://doxyterra.md";

const requestList = await RequestList.open(name, [
  { url: "https://doxyterra.md/ro/", label: "home" },
]);
const requestQueue = await RequestQueue.open(name);
const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new JSDOMCrawler({
  requestList,
  requestQueue,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log }) => {
  log.info(`enqueueing categories URLs on ${baseUrl}`);
  await enqueueLinks({
    selector: "a.categories__submenu__link",
    label: "category",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addHandler("category", async ({ enqueueLinks, log, window }) => {
  log.info(`enqueueing doxyterra subcategories on ${window.location.href}`);
  await enqueueLinks({
    selector: ".categories__item__image > a",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addDefaultHandler(async ({ log, window }) => {
  log.info(`scraping products on doxyterra on page ${window.location.href}`);

  const $items = window.document.querySelectorAll(".product__item.js-content");
  for (const $item of $items) {
    const skuText = $item.querySelector(".product__code__value")?.textContent;
    const sku = skuText ? normalizeString(skuText) : undefined;
    const $anchor = $item.querySelector(".product__item__image > a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;

    const $image = $anchor.querySelector("img")!;
    const imageUrl = $anchor.querySelector("img")!.src;
    const name = normalizeString($image.getAttribute("alt")!);

    const priceText =
      $item.querySelector(".product__item__price__current")?.textContent ?? "";
    const price = getDecimalPrice(priceText);
    if (price === null) {
      log.warning(`Invalid price found on product "${name}" on doxyterra`);
      continue;
    }

    await dataset.pushData({
      name,
      url,
      price,
      currency: "MDL",
      storeName: name,
      imageUrl,
      sku,
    });
  }
});

export default new ProductCrawler({
  name,
  crawler,
  dataset,
});
