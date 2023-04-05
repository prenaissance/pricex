import { Dataset, JSDOMCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "darwin";
const baseUrl = "https://darwin.md/";

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
    selector: ".menu.menu_mobile_top li.level1 > a",
    requestQueue,
    label: "category",
  });
});

crawler.router.addHandler("category", async ({ enqueueLinks, log, window }) => {
  const $subcategories = window.document.querySelectorAll(
    "div.card.card-product",
  );
  if (!$subcategories.length) {
    log.info(
      `link ${window.location.pathname} is not a subcategory, labeling as default`,
    );
    crawler.addRequests([window.location.href]);
  } else {
    await enqueueLinks({
      selector: "div.card.card-product a",
      requestQueue,
    });
  }
});

crawler.router.addDefaultHandler(async ({ enqueueLinks, log, window }) => {
  log.info(`scraping products on darwin on page ${window.location.href}`);
  const nextButton = window.document.querySelector(
    "a.page-link[rel='next']",
  ) as HTMLAnchorElement | null;
  if (nextButton && window.getComputedStyle(nextButton).display !== "none") {
    log.info(`enqueueing next page ${nextButton.href}`);
    await enqueueLinks({
      selector: "a.page-link[rel='next']",
      requestQueue,
    });
  }

  const $items = window.document.querySelectorAll(
    ".products figure.card.card-product",
  );
  log.debug(`found ${$items.length} products on page ${window.location.href}`);
  for (const $item of $items) {
    const $anchor = $item.querySelector(".img-wrap > a")!;
    const url = new URL($anchor.getAttribute("href")!, baseUrl).href;
    const name = normalizeString($anchor.getAttribute("title")!);

    const imageUrl = $anchor.querySelector("img")!.src;

    const $description = $item.querySelector(
      "figcaption > span.specification",
    )!;
    const description = $description?.textContent
      ? normalizeString($description.textContent)
      : undefined;
    const priceText = $item.querySelector("span.price-new")?.textContent ?? "";
    const price = getDecimalPrice(priceText);
    if (price === null) {
      log.warning(
        `could not parse price on product ${name} on page ${window.location.href}`,
      );
      continue;
    }

    await dataset.pushData({
      name,
      description,
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
