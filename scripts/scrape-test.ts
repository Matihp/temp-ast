import { fetchHtml, extractDataWithAI, generateSelectorsWithAI, extractWithSelectors, type ProductSelectors } from '../src/lib/scraper/index';
import { collectProductUrls } from '../src/lib/scraper/collector';

const CATEGORY_URLS = [
  "https://www.sporting.com.ar/sporting/indumentaria",
  "https://www.sporting.com.ar/hombre",
  "https://www.sportline.com.ar/mujer/indumentaria",
  "https://www.sportline.com.ar/hombre/indumentaria"
];

const API_ENDPOINT = 'http://localhost:4321/api/products';
const MAX_PRODUCTS_PER_CATEGORY = 50;

// Helper for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cache for selectors per domain
const selectorCache = new Map<string, ProductSelectors>();

async function run() {
  console.log("Starting scraping job (Hybrid AI/Selector Mode)...");

  for (const catUrl of CATEGORY_URLS) {
    console.log(`\n=== Processing Category: ${catUrl} ===`);

    const productUrls = await collectProductUrls(catUrl);

    if (productUrls.length === 0) {
      console.warn("  ! No products found in this category. Skipping.");
      continue;
    }

    const toProcess = productUrls.slice(0, MAX_PRODUCTS_PER_CATEGORY);
    console.log(`  > Will process ${toProcess.length} products (out of ${productUrls.length} found).`);

    const domain = new URL(catUrl).hostname;
    let currentSelectors = selectorCache.get(domain);

    for (const [index, url] of toProcess.entries()) {
      // Rate limiting: sleep 2s between requests to avoid ConnectTimeoutError
      if (index > 0) await sleep(2000);

      console.log(`\n  --- Product ${index + 1}/${toProcess.length}: ${url} ---`);
      try {
        console.log("    - Fetching HTML...");
        const html = await fetchHtml(url);

        let productData;

        // Hybrid Strategy: Use cached selectors if available
        if (currentSelectors) {
          console.log("    - Extracting with cached selectors...");
          productData = extractWithSelectors(html, currentSelectors);

          // Validation: If extraction failed badly (e.g. no name), retry with AI and update selectors
          if (!productData.name || productData.name === 'Unknown' || !productData.price) {
             console.warn("    ! Selector extraction seems invalid (missing name/price). Retrying with AI...");
             currentSelectors = undefined; // Force AI check for this product
          }
        }

        if (!currentSelectors) {
          console.log("    - Analyzing structure with AI to generate selectors...");
          try {
            currentSelectors = await generateSelectorsWithAI(html, 'ministral-3');
            console.log("      > Generated selectors:", currentSelectors);
            selectorCache.set(domain, currentSelectors);
            productData = extractWithSelectors(html, currentSelectors);
          } catch (e: any) {
            console.error(`      ! AI Selector generation failed/invalid (${e.message}). Fallback to direct extraction.`);
            // Do NOT cache selectors if they failed validation
            currentSelectors = undefined;
            productData = await extractDataWithAI(html, 'ministral-3');
          }
        }

        console.log("      > Extracted:", productData);

        // 4. Save to DB
        console.log("    - Saving to database...");
        try {
          const saveRes = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...productData, url }),
          });

          if (saveRes.ok) {
            console.log("      > Success!");
          } else {
            console.error("      > Failed to save:", await saveRes.text());
          }
        } catch (fetchError: any) {
          if (fetchError.cause && fetchError.cause.code === 'ECONNREFUSED') {
            console.error("      > ! Error connecting to API. Make sure Astro is running on port 4321 (npm run dev).");
          } else {
            console.error("      > ! Error saving:", fetchError.message);
          }
        }

      } catch (error) {
        console.error(`    ! Error processing product ${url}:`, error);
      }
    }
  }

  console.log("\nJob finished.");
}

run();
