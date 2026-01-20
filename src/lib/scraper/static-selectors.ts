import { type ProductSelectors } from './index';

// Static selectors can still be useful for non-VTEX sites or where JSON-LD is missing.
// However, for VTEX, we now rely primarily on Metadata Extraction.
export const STATIC_SELECTORS: Record<string, ProductSelectors> = {
  // Keeping these as fallback or for sites that render HTML serverside
  'vtex-generic': {
    name: '.vtex-store-components-3-x-productBrand, .vtex-product-name',
    brand: '.vtex-store-components-3-x-productBrandName, .vtex-product-brand',
    price: '.vtex-store-components-3-x-sellingPriceValue, .vtex-product-price-1-x-currencyContainer',
    size: '.vtex-store-components-3-x-skuSelectorItemText',
    color: '.vtex-store-components-3-x-skuSelectorItemImageValue',
    imageUrl: '.vtex-store-components-3-x-productImageTag, img.vtex-store-components-3-x-productImageTag--main'
  },
  'sporting.com.ar': {
    name: 'h1', // Generic fallback
    brand: 'meta[property="product:brand"]',
    price: 'meta[property="product:price:amount"]',
    size: 'div.vtex-store-components-3-x-skuSelectorItemText',
    imageUrl: 'meta[property="og:image"]'
  },
  'sportline.com.ar': {
    name: '.vtex-store-components-3-x-productBrand',
    brand: '.vtex-store-components-3-x-productBrandName',
    price: '.vtex-product-price-1-x-currencyContainer',
    size: '.vtex-store-components-3-x-skuSelectorItemText',
    imageUrl: '.vtex-store-components-3-x-productImageTag'
  }
};

export function getStaticSelectors(url: string): ProductSelectors | undefined {
  try {
    // Normalize hostname: remove www. and handle subdomains
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');

    // 1. Exact match or Contains match
    // Check if any key in STATIC_SELECTORS is contained within the hostname
    const matchedKey = Object.keys(STATIC_SELECTORS).find(key => hostname.includes(key));
    if (matchedKey) {
      return STATIC_SELECTORS[matchedKey];
    }

    return undefined;
  } catch {
    return undefined;
  }
}
