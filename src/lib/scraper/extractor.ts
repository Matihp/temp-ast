import * as cheerio from 'cheerio';
import { type ExtractedProduct } from './index';

export function extractFromMetadata(html: string): ExtractedProduct | null {
  const $ = cheerio.load(html);
  let product: Partial<ExtractedProduct> = {};

  // 1. Try JSON-LD
  // There might be multiple scripts, find the one with @type "Product"
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      // Sometimes it's an array or a graph
      const items = Array.isArray(json) ? json : (json['@graph'] || [json]);

      const productItem = items.find((item: any) => item['@type'] === 'Product');
      if (productItem) {
        product.name = productItem.name;
        product.brand = productItem.brand?.name || productItem.brand;
        product.imageUrl = productItem.image;

        // Handle offers for price
        const offers = productItem.offers;
        if (offers) {
            const offer = Array.isArray(offers) ? offers[0] : offers;
            if (offer) {
                // Remove $ and non-numeric chars except dot/comma
                const priceStr = String(offer.price || offer.lowPrice || offer.highPrice || '0');
                product.price = parseFloat(priceStr);
            }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  // 2. Try OpenGraph / Meta Tags (Fallback if JSON-LD missing/incomplete)
  if (!product.name) product.name = $('meta[property="og:title"]').attr('content');
  if (!product.imageUrl) product.imageUrl = $('meta[property="og:image"]').attr('content');

  // Specific VTEX meta tags
  if (!product.price) {
      // VTEX often puts price in meta tags like product:price:amount
      const priceMeta = $('meta[property="product:price:amount"]').attr('content');
      if (priceMeta) product.price = parseFloat(priceMeta);
  }

  // If we found at least a name, return it
  if (product.name) {
    return {
        name: product.name,
        brand: product.brand,
        price: product.price || 0,
        imageUrl: product.imageUrl,
        size: undefined, // Usually hard to get from meta
        color: undefined,
        type: 'unknown',
        gender: 'unknown'
    };
  }

  return null;
}
