import {
  Dataset,
  JSDOMCrawler,
  Request,
  RequestList,
  RequestQueue,
} from "crawlee";
import ProductInfo from "@/data/schemas/product-info";
import { normalizeString } from "@/parsing/extractors";
import { ProductCrawler } from "@/common/product-crawler";

const name = "uno";
const baseUrl = "https://uno.md";

const requestList = await RequestList.open(name, [
  { url: baseUrl, label: "home" },
]);
const requestQueue = await RequestQueue.open(name);
const dataset = await Dataset.open<ProductInfo>(name);

const crawler = new JSDOMCrawler({
  requestList,
  requestQueue,
});

crawler.router.addHandler("home", async ({ enqueueLinks, log, request }) => {
  log.info(`enqueueing categories URLs on ${request.url}`);
  await enqueueLinks({
    selector: "a.categories__category__link",
    label: "category",
    requestQueue,
    baseUrl,
  });
});

crawler.router.addHandler(
  "category",
  async ({ enqueueLinks, log, request }) => {
    log.info(`enqueueing subcategories URLs on ${request.url}`);
    await enqueueLinks({
      selector: "a.category-card__main-link",
      label: "subcategory",
      requestQueue,
      baseUrl,
    });
  },
);

type ProductsPayload = {
  data: {
    id: number;
    url: string;
    title: string;
    price: number;
    paramsDescription: string;
    image: string;
  }[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
};

crawler.router.addHandler(
  "subcategory",
  async ({ enqueueLinks, log, window }) => {
    const $subcategories = window.document.querySelector(
      ".category-block.block",
    );
    if ($subcategories) {
      log.info(`enqueueing sub-subcategories in ${window.location.href}`);
      await enqueueLinks({
        selector: "a.category-card__main-link",
        label: "subcategory",
        requestQueue,
        baseUrl,
      });
    } else {
      log.info(`url ${window.location.href} is a product page, labeling so`);
      await requestQueue.addRequest(
        new Request({
          url: `${baseUrl}/api/product?category=${window.location.pathname.replace(
            "/",
            "",
          )}&page=1`,
          skipNavigation: true,
        }),
      );
    }
  },
);

crawler.router.addDefaultHandler(async ({ log, sendRequest, request }) => {
  log.info(`scraping products on uno on page ${request.url}`);

  const response = await sendRequest({
    url: request.url,
  });
  const payload = JSON.parse(response.body) as ProductsPayload;
  const products = payload.data.map(
    ({ title, price, url, image, paramsDescription, id }) => ({
      name: normalizeString(title),
      price,
      url: new URL(url, baseUrl).href,
      imageUrl: new URL(image, baseUrl).href,
      description: normalizeString(paramsDescription),
      sku: id.toString(),
      currency: "MDL",
      storeName: name,
    }),
  );

  await dataset.pushData(products);
  if (payload.links.next) {
    await requestQueue.addRequest(
      new Request({
        url: payload.links.next,
        skipNavigation: true,
      }),
    );
  }
});

export default new ProductCrawler({
  name,
  crawler,
  dataset,
});
