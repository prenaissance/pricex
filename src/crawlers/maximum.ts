import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "maximum";
const baseUrl = "https://maximum.md";

const requestList = await RequestList.open(name, [
  { url: "https://maximum.md/ro/", label: "home" },
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
    selector:
      "li.header__menu__list__item__level-1__container__products:not(:first-child):not(:last-child) > a",
    label: "category",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addHandler("category", async ({ enqueueLinks, log, window }) => {
  log.info(`enqueueing maximum subcategories on ${window.location.href}`);
  await enqueueLinks({
    selector: ".categories_item_link > a",
    requestQueue,
    label: "subcategory",
    baseUrl,
  });
});

crawler.router.addHandler(
  "subcategory",
  async ({ enqueueLinks, log, window }) => {
    log.info(`enqueueing maximum sub-subcategories on ${window.location.href}`);
    await enqueueLinks({
      selector: ".categories_item_link > a",
      requestQueue,
      baseUrl,
    });
  },
);

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(`scraping products on maximum on page ${window.location.href}`);
  const nextChevron = window.document.querySelector("span.fa.fa-chevron-right");
  if (nextChevron !== null) {
    log.info(`enqueueing next page on ${window.location.href}`);
    const url = nextChevron.parentElement!.getAttribute("href")!;
    await enqueueLinks({
      requestQueue,
      urls: [url],
      baseUrl,
    });
  }

  const $items = window.document.querySelectorAll(
    ".wrap_search_page > .js-content.product__item",
  );
  for (const $item of $items) {
    const $anchor = $item.querySelector(".product__item__image > a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;

    const $image = $anchor.querySelector("img")!;
    const imageUrl =
      $anchor.querySelector("img")!.getAttribute("data-src") ?? "";
    const name = normalizeString($image.getAttribute("alt")!);

    const priceText = $item.querySelector(
      ".product__item__price-current",
    )?.textContent;
    const price = getDecimalPrice(priceText ?? "");
    if (price === null) {
      log.warning(`Invalid price found on product ${name} on maximum`);
      continue;
    }

    await dataset.pushData({
      name,
      url,
      price,
      currency: "MDL",
      storeName: name,
      imageUrl,
    });
  }
});

export default new ProductCrawler({
  name,
  crawler,
  dataset,
});
