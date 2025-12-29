import * as cheerio from 'cheerio';

interface SiteStrategy {
  domain: string;
  productLinkSelector?: string;
  productLinkPattern?: RegExp;
}

const STRATEGIES: SiteStrategy[] = [
  {
    domain: 'sporting.com.ar',
    // Sporting uses standard VTEX structure: https://www.sporting.com.ar/NAME/p
    // We want to avoid listing pages that have parameters like ?initialMap or searchState
    productLinkPattern: /\/p($|\?)/i,
    // Selector should be specific if possible, but "a" with filtering is safer than broad selector
    productLinkSelector: undefined
  },
  {
    domain: 'sportline.com.ar',
    // Examples: https://www.sportline.com.ar/remera-.../p
    productLinkPattern: /\/p($|\?)/i,
    productLinkSelector: undefined
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
    console.log(`  [Collector] Fetching category page: ${categoryUrl}`);

    // Add real headers to avoid blocking and ensure content delivery
    const res = await fetch(categoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.google.com/'
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch ${categoryUrl}: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const strategy = getStrategy(categoryUrl);
    const productUrls = new Set<string>();
    const baseUrl = new URL(categoryUrl).origin;

    // Strategy 1: JSON-LD (ItemList) - Very reliable for e-commerce
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        // Handle direct ItemList or @graph array
        const items = Array.isArray(json) ? json : [json];

        items.forEach(item => {
          if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
            item.itemListElement.forEach((element: any) => {
              const url = element.url || element.item; // standard property is url, sometimes item string
              if (typeof url === 'string') {
                productUrls.add(resolveUrl(url, baseUrl));
              }
            });
          }
        });
      } catch (e) {
        // ignore parse errors
      }
    });

    if (productUrls.size > 0) {
      console.log(`  [Collector] Found ${productUrls.size} URLs via JSON-LD.`);
    }

    // Strategy 2: Regex / Selectors (Fallback or Supplement)
    if (productUrls.size === 0) {
      if (strategy) {
        // console.log(`  [Collector] Using strategy for ${strategy.domain}`);
        if (strategy.productLinkSelector) {
          $(strategy.productLinkSelector).each((_, el) => {
            const href = $(el).attr('href');
            if (href) productUrls.add(resolveUrl(href, baseUrl));
          });
        }

        if (strategy.productLinkPattern) {
          $('a').each((_, el) => {
            const href = $(el).attr('href');
            // Check if href matches pattern AND is NOT a query string mess if possible
            if (href && strategy.productLinkPattern!.test(href)) {
               productUrls.add(resolveUrl(href, baseUrl));
            }
          });
        }
      } else {
        // Generic Fallback
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            // Common e-commerce patterns
            if (/\/p\/|product\/|\/p$|item\//i.test(href)) {
               productUrls.add(resolveUrl(href, baseUrl));
            }
          }
        });
      }
    }

    const results = Array.from(productUrls)
      .filter(u => u.startsWith('http'))
      .filter(u => !u.includes('initialMap=') && !u.includes('searchState=') && !u.includes('map=')); // Global filter for garbage

    console.log(`  [Collector] Final: ${results.length} unique product URLs.`);
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
