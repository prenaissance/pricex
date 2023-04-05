import { Dataset, PlaywrightCrawler, RequestList, RequestQueue } from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { getDecimalPrice, normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "Neocomputer";
const baseUrl = "https://neocomputer.md";

const requestList = await RequestList.open(name, [
  { url: "https://neocomputer.md/ro", label: "home" },
]);
const requestQueue = await RequestQueue.open(name);
const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new PlaywrightCrawler({
  requestList,
  requestQueue,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log }) => {
  log.info(`enqueueing categories URLs on ${baseUrl}`);
  await enqueueLinks({
    selector: "a.category-item",
    requestQueue,
  });
});

crawler.router.addDefaultHandler(async ({ log, page }) => {
  const itemsLocator = page.locator(".row.products-list > .col-lg-4.col-6 > a");
  const nextNav = page.locator(".page-nav.next");
  log.info(`scraping products on Neocomputer on page ${page.url()}`);

  const processItems = async () => {
    await page.waitForLoadState("networkidle");

    const rawItems = await itemsLocator.evaluateAll((nodes) =>
      nodes.map((node) => {
        const $image = node.querySelector(".product-image img")!;
        const name = $image.getAttribute("alt") ?? "";
        const imageUrl = $image.getAttribute("src") ?? "";
        const price =
          node.querySelector(".product-footer .price-current")?.textContent ??
          "";
        const url = node.getAttribute("href")!;

        return {
          name,
          price,
          imageUrl,
          url,
          storeName: "Neocomputer",
          currency: "MDL",
        };
      }),
    );
    const items = rawItems
      .map((item) => ({
        ...item,
        price: getDecimalPrice(item.price),
        name: normalizeString(item.name),
      }))
      .filter((item) => item.price !== null) as ProductInfo[];
    log.debug(`found ${items.length} items on ${page.url()}`);

    await dataset.pushData(items);
    if (await nextNav.isVisible()) {
      await nextNav.click();
      await processItems();
    }
  };

  await processItems();
});

export default new ProductCrawler({
  name,
  crawler,
  dataset,
});
