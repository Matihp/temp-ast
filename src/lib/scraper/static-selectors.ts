import { type ProductSelectors } from './index';

// Static selectors for known platforms/domains to bypass AI generation
export const STATIC_SELECTORS: Record<string, ProductSelectors> = {
  // Generic VTEX Selectors (Working for sporting.com.ar, sportline.com.ar, etc)
  'vtex-generic': {
    name: '.vtex-store-components-3-x-productBrand, .vtex-product-name',
    brand: '.vtex-store-components-3-x-productBrandName, .vtex-product-brand',
    price: '.vtex-store-components-3-x-sellingPriceValue, .vtex-product-price-1-x-currencyContainer',
    size: '.vtex-store-components-3-x-skuSelectorItemText',
    color: '.vtex-store-components-3-x-skuSelectorItemImageValue',
    imageUrl: '.vtex-store-components-3-x-productImageTag, img.vtex-store-components-3-x-productImageTag--main'
  },
  // Specific domains (can override generic if needed)
  'sporting.com.ar': {
    name: 'span.vtex-store-components-3-x-productBrand',
    brand: 'span.vtex-store-components-3-x-productBrandName',
    price: 'span.vtex-product-price-1-x-currencyContainer', // Often inside a container
    size: 'div.vtex-store-components-3-x-skuSelectorItemText',
    imageUrl: 'img.vtex-store-components-3-x-productImageTag'
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
    const hostname = new URL(url).hostname.replace('www.', '');

    // 1. Exact match
    if (STATIC_SELECTORS[hostname]) {
      return STATIC_SELECTORS[hostname];
    }

    // 2. Platform detection (Basic heuristic for VTEX)
    // This assumes the calling code might pass a flag, but for now we rely on domain matching.
    // We could add logic here to check HTML content, but that requires passing HTML.

    return undefined;
  } catch {
    return undefined;
  }
}
