import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "enter";
const baseUrl = "https://enter.online";

const requestList = await RequestList.open(name, [
  { url: baseUrl, label: "home" },
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
    selector: "#menu a",
    label: "category",
    requestQueue,
  });
});

crawler.router.addHandler("category", async ({ enqueueLinks, log, window }) => {
  log.info(`enqueueing Enter subcategory ${window.location.pathname}`);
  await enqueueLinks({
    selector: ".content a",
    requestQueue,
  });
});

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(`scraping products on Enter on page ${window.location.pathname}`);
  await enqueueLinks({
    selector: ".page-nav a",
    requestQueue,
    globs: ["https://enter.online/**/*\\?page=*"],
    exclude: ["https://enter.online/**/*\\?page=1"],
  });

  const $items = window.document.querySelectorAll(".grid-item");
  for (const $item of $items) {
    const $anchor = $item.querySelector("a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;
    const name = normalizeString($anchor.getAttribute("title")!);

    const imageUrl =
      $anchor.querySelector("img")!.getAttribute("data-src") ?? "";
    const $description = $anchor.querySelector(".product-descr");
    const description = $description?.textContent
      ? normalizeString($description.textContent)
      : undefined;
    const sku = $description?.getAttribute("data-id") ?? undefined;

    const $priceContainer = $item.querySelector(".grid-price")!;
    const regularPrice = $priceContainer.querySelector(".price")?.textContent;
    const salePrice = $priceContainer.querySelector(".price-new")?.textContent;
    if (!regularPrice && !salePrice) {
      log.warning(`No price found on product ${name} on Enter`);
      continue;
    }
    const price = getDecimalPrice(salePrice ?? regularPrice!);
    if (price === null) {
      log.warning(`Invalid price found on product ${name} on Enter`);
      continue;
    }

    await dataset.pushData({
      name,
      description,
      sku,
      url,
      price,
      currency: "MDL",
      storeName: "Enter",
      imageUrl,
    });
  }
});

export default new ProductCrawler({
  name,
  crawler,
  dataset,
});
