import { crawlers } from "./crawlers";

crawlers.forEach((crawler) => {
  crawler.crawl();
});
