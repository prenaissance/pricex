import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

export const name = "ht";
export const baseUrl = "https://h-t.md/";

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
    selector: "a.ty-menu__item-link.a-first-lvl",
    requestQueue,
  });
});

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(
    `scraping products on ht on page ${
      window.location.pathname + window.location.search
    }`,
  );

  await enqueueLinks({
    selector:
      "a.ty-pagination__item.ty-pagination__btn.ty-pagination__next.cm-history.cm-ajax.ty-pagination__right-arrow",
    requestQueue,
  });

  const $items = window.document.querySelectorAll(".ypi-grid-list__item_body");

  for (const $item of $items) {
    const $anchor = $item.querySelector("a.abt-single-image")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;
    const imageUrl = new URL(
      $anchor.querySelector("img")?.getAttribute("data-src") ?? "",
      baseUrl,
    ).href;

    const name = normalizeString(
      $item.querySelector(".ty-grid-list__item-name a.product-title")!
        .textContent!,
    );
    const price = getDecimalPrice(
      $item.querySelector(".ty-price-update")?.textContent ?? "",
    );
    if (!price) {
      log.warning(`Invalid price for ${name} on ht`);
      continue;
    }

    await dataset.pushData({
      name,
      url,
      imageUrl,
      price,
      currency: "MDL",
      storeName: name,
    });
  }
});

export default new ProductCrawler({ crawler, dataset, name });
