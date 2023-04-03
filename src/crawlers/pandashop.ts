import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "pandashop";
const baseUrl = "https://www.pandashop.md";

const requestList = await RequestList.open(name, [
  { url: "https://www.pandashop.md/ro/catalog/", label: "home" },
]);
const requestQueue = await RequestQueue.open(name);
const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new JSDOMCrawler({
  requestList,
  requestQueue,
  maxRequestsPerCrawl: 1,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log }) => {
  log.info(`enqueueing categories URLs on ${baseUrl}`);
  await enqueueLinks({
    selector: "nav a",
    label: "category",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addHandler("category", async ({ enqueueLinks, log, window }) => {
  log.info(`enqueueing Pandashop subcategories in ${window.location.pathname}`);
  await enqueueLinks({
    selector: "nav a",
    label: "subcategory",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addHandler(
  "subcategory",
  async ({ enqueueLinks, log, window }) => {
    log.info(
      `enqueueing Pandashop sub-subcategories in ${window.location.pathname}`,
    );
    await enqueueLinks({
      selector: "nav a",
      requestQueue,
      baseUrl,
    });
  },
);

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(
    `scraping products on Pandashop on page ${window.location.pathname}`,
  );
  await enqueueLinks({
    selector: ".paging_list a",
    requestQueue,
    baseUrl,
  });

  const $items = window.document.querySelectorAll(".card .js-itemsList-item");

  for (const $item of $items) {
    const sku = $item.getAttribute("data-product")!;
    const $anchor = $item.querySelector(".card-inner > a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;
    const $picture = $anchor.querySelector("picture.card-img-picture")!;
    const imageUrl = $picture.querySelector("img")!.src;

    const $itemBody = $item.querySelector(".card-body")!;
    const name = normalizeString(
      $itemBody.querySelector("a.card-title")!.textContent!,
    );
    const price = getDecimalPrice(
      $item.querySelector(".card-price_curr")!.textContent!,
    );
    if (price === null) {
      log.warning(`Invalid price for ${name} on Pandashop`);
      continue;
    }

    await dataset.pushData({
      url,
      name,
      sku,
      imageUrl,
      price,
      currency: "MDL",
      storeName: name,
    });
  }
});

export default new ProductCrawler({
  name,
  crawler,
  dataset,
});
