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
    // We use the existing fetchHtml but we might want the raw HTML structure before cleanup
    // Actually fetchHtml cleans up scripts/styles which is fine, we just need <a> tags.
    // However, fetchHtml returns body text currently!
    // Wait, fetchHtml in index.ts returns: $('body').text()...
    // That removes tags! We need a version that returns cheerio instance or HTML string.

    // I need to modify fetchHtml or create a new fetch helper that returns the cheerio object or raw HTML.
    // Let's create a specialized fetch for collection here or refactor index.ts.
    // Refactoring index.ts is better design.

    // For now, let's just re-implement a simple fetch here to avoid breaking index.ts logic
    // (which is tuned for AI text extraction).
    const res = await fetch(categoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${categoryUrl}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const strategy = getStrategy(categoryUrl);
    const productUrls = new Set<string>();
    const baseUrl = new URL(categoryUrl).origin;

    if (strategy) {
      console.log(`  [Collector] Using strategy for ${strategy.domain}`);

      // Method 1: Selector
      if (strategy.productLinkSelector) {
        $(strategy.productLinkSelector).each((_, el) => {
          const href = $(el).attr('href');
          if (href) productUrls.add(resolveUrl(href, baseUrl));
        });
      }

      // Method 2: Regex on all links (if selector missed or as secondary)
      if (strategy.productLinkPattern) {
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          if (href && strategy.productLinkPattern!.test(href)) {
            productUrls.add(resolveUrl(href, baseUrl));
          }
        });
      }
    } else {
      console.log(`  [Collector] No strategy found. Using heuristic (generic fallback).`);
      // Heuristic: Look for links containing /p/ or /product/ or similar common patterns
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          if (/\/p\/|product\/|\/p$|item\//i.test(href)) {
             productUrls.add(resolveUrl(href, baseUrl));
          }
        }
      });
    }

    const results = Array.from(productUrls)
      .filter(u => u.startsWith('http'))
      .filter(u => !u.includes('initialMap=') && !u.includes('searchState=') && !u.includes('map=')); // Global filter for garbage
    console.log(`  [Collector] Found ${results.length} unique product URLs.`);
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
