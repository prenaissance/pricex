import { JSDOMCrawler, RequestList, RequestQueue, Dataset } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice } from "../parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";
const name = "shopit";
const baseUrl = "https://shopit.md";
const requestList = await RequestList.open(name, [
  { url: "https://shopit.md/ro", label: "home" },
]);
const requestQueue = await RequestQueue.open(name);

const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new JSDOMCrawler({
  requestList,
  requestQueue,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log }) => {
  log.info(`enqueueing home page navigation URLs on ${baseUrl}`);
  await enqueueLinks({
    globs: ["https://shopit.md/ro/catalog/*"],
    label: "category",
    requestQueue,
  });
});

crawler.router.addHandler(
  "category",
  async ({ enqueueLinks, log, window, request }) => {
    log.info(
      `scraping products on shopit on page ${new URL(request.url).pathname}`,
    );

    await enqueueLinks({
      globs: ["https://shopit.md/ro/catalog/**/page[!1]*"],
      label: "category",
      requestQueue,
    });

    const $items = window.document.querySelectorAll(
      "#catalog-items .product.box",
    );

    for (const $item of $items) {
      const priceText =
        $item.querySelector(".caption > .price > .price-new")!.textContent ??
        "";
      const price = getDecimalPrice(priceText);
      if (price === null) {
        continue;
      }
      const $imageAnchor = $item.querySelector(".image a")!;
      const $image = $imageAnchor.querySelector("img")!;
      const imageUrl = $image.getAttribute("src")!;
      const sku = $image.getAttribute("data-id")!;
      const url = new URL($imageAnchor.getAttribute("href")!, baseUrl).href;

      const $headerGroup = $item.querySelector(".caption > h4 > a")!;
      const name = $headerGroup.querySelector(".name")!.textContent ?? "";
      const description =
        $headerGroup.querySelector(".description")?.textContent ?? undefined;

      await dataset.pushData({
        name,
        description,
        url,
        price,
        currency: "MDL",
        storeName: "shopit",
        imageUrl,
        sku,
      });
    }
  },
);

export default new ProductCrawler({ name, crawler, dataset });
