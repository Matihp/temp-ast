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

  // 2. Try VTEX skuJson or skuSpecifications (in scripts)
  // This contains real stock information, sizes, and colors.
  $('script').each((_, el) => {
    const scriptContent = $(el).html() || '';

    // Look for skuJson_0 = {...} (common in VTEX legacy)
    // or sometimes just skuJson = {...}
    if (scriptContent.includes('skuJson')) {
       try {
           // Regex to extract the JSON object
           const match = scriptContent.match(/skuJson(?:_\d+)?\s*=\s*(\{.*?\});/s);
           if (match && match[1]) {
               const skuJson = JSON.parse(match[1]);

               // Extract Sizes
               // Usually dimensions are in "dimensions" key, e.g. "Talle": "M"
               if (skuJson.skus && Array.isArray(skuJson.skus)) {
                   const sizes = new Set<string>();
                   skuJson.skus.forEach((sku: any) => {
                       if (sku.available && sku.dimensions && sku.dimensions.Talle) {
                           sizes.add(sku.dimensions.Talle);
                       }
                       // Sometimes it's "Talla" or just "Size"
                       if (sku.available && sku.dimensions && sku.dimensions.Size) {
                           sizes.add(sku.dimensions.Size);
                       }
                       // Or extract from SKU name if dimensions missing
                       if (sku.available && sku.skuname) {
                           // Attempt to find size in name (risky)
                       }
                   });
                   if (sizes.size > 0) {
                       product.size = Array.from(sizes).join('/');
                   }
               }
           }
       } catch (e) {
           // console.warn("Failed to parse VTEX skuJson");
       }
    }
  });


  // 3. Try OpenGraph / Meta Tags (Fallback if JSON-LD missing/incomplete)
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
        size: product.size, // Now populated from VTEX scripts if found
        color: undefined,   // Often enriched later by enricher.ts
        type: 'unknown',
        gender: 'unknown'
    };
  }

  return null;
}
