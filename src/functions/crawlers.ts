import darwin from "@/crawlers/darwin";
import cosmo from "@/crawlers/cosmo";
import { registerTimerCrawler } from "@/common/function-factory";

const crawlers = [darwin];

crawlers.forEach(registerTimerCrawler);
