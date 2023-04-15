import darwin from "@/crawlers/darwin";
import cosmo from "@/crawlers/cosmo";
import { registerTimerCrawler } from "@/common/function-factory";

const crawlers = [darwin, cosmo];

crawlers.forEach(registerTimerCrawler);
