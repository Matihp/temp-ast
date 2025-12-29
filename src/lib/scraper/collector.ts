import * as cheerio from 'cheerio';

interface SiteStrategy {
  domain: string;
  apiPattern?: (url: URL) => string;
}

const STRATEGIES: SiteStrategy[] = [
  {
    domain: 'sporting.com.ar',
    // Transform category URL to VTEX Search API URL
    // URL: https://www.sporting.com.ar/sporting/indumentaria
    // API: https://www.sporting.com.ar/api/catalog_system/pub/products/search/sporting/indumentaria
    apiPattern: (url: URL) => `${url.origin}/api/catalog_system/pub/products/search${url.pathname}?_from=0&_to=49`
  },
  {
    domain: 'sportline.com.ar',
    apiPattern: (url: URL) => `${url.origin}/api/catalog_system/pub/products/search${url.pathname}?_from=0&_to=49`
  }
];

function getStrategy(url: string): SiteStrategy | undefined {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return STRATEGIES.find(s => domain.includes(s.domain));
  } catch {
    return undefined;
  }
}

export async function collectProductUrls(categoryUrl: string): Promise<string[]> {
  try {
    console.log(`  [Collector] Analyzing category: ${categoryUrl}`);
    const urlObj = new URL(categoryUrl);
    const strategy = getStrategy(categoryUrl);

    // Strategy 1: VTEX API (Preferred for known sites)
    if (strategy && strategy.apiPattern) {
      const apiUrl = strategy.apiPattern(urlObj);
      console.log(`  [Collector] Detected VTEX site. Using API: ${apiUrl}`);
      try {
        const res = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });

        if (res.ok || res.status === 206) {
          const json = await res.json();
          if (Array.isArray(json)) {
            console.log(`  [Collector] API returned ${json.length} products.`);
            // Extract 'link' property
            const links = json.map((item: any) => item.link).filter((l: string) => typeof l === 'string');
            return links;
          }
        } else {
          console.warn(`  [Collector] API fetch failed: ${res.status}. Falling back to HTML.`);
        }
      } catch (e) {
        console.warn(`  [Collector] API strategy error:`, e);
      }
    }

    // Strategy 2: HTML Scraping (Fallback)
    console.log(`  [Collector] Fetching HTML fallback: ${categoryUrl}`);
    const res = await fetch(categoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch ${categoryUrl}: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const productUrls = new Set<string>();
    const baseUrl = urlObj.origin;

    // JSON-LD Check
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        const items = Array.isArray(json) ? json : [json];
        items.forEach(item => {
          if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
            item.itemListElement.forEach((element: any) => {
              const url = element.url || element.item;
              if (typeof url === 'string') productUrls.add(resolveUrl(url, baseUrl));
            });
          }
        });
      } catch (e) {}
    });

    // Heuristic Fallback
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        // Generic pattern for product pages (e.g., /p, /product, /item) avoiding common noise
        if (/\/p(\/|$|\?)/i.test(href) && !href.includes('initialMap') && !href.includes('searchState')) {
           productUrls.add(resolveUrl(href, baseUrl));
        }
      }
    });

    const results = Array.from(productUrls).filter(u => u.startsWith('http'));
    console.log(`  [Collector] Found ${results.length} URLs via HTML scraping.`);
    return results;

  } catch (error) {
    console.error(`  [Collector] Error collecting URLs:`, error);
    return [];
  }
}

function resolveUrl(href: string, baseUrl: string): string {
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `${baseUrl}${href}`;
  return `${baseUrl}/${href}`;
}
