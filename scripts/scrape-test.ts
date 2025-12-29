import { fetchHtml, extractDataWithAI } from '../src/lib/scraper/index';
import { collectProductUrls } from '../src/lib/scraper/collector';

const CATEGORY_URLS = [
  "https://www.sporting.com.ar/sporting/indumentaria",
  "https://www.sporting.com.ar/hombre",
  "https://www.sportline.com.ar/mujer/indumentaria",
  "https://www.sportline.com.ar/hombre/indumentaria"
];

const API_ENDPOINT = 'http://localhost:4321/api/products';
const MAX_PRODUCTS_PER_CATEGORY = 5; // Limit for testing

async function run() {
  console.log("Starting scraping job (Full Cycle)...");

  for (const catUrl of CATEGORY_URLS) {
    console.log(`\n=== Processing Category: ${catUrl} ===`);

    // 1. Collect URLs
    const productUrls = await collectProductUrls(catUrl);

    if (productUrls.length === 0) {
      console.warn("  ! No products found in this category. Skipping.");
      continue;
    }

    // Limit the number of products to process
    const toProcess = productUrls.slice(0, MAX_PRODUCTS_PER_CATEGORY);
    console.log(`  > Will process ${toProcess.length} products (out of ${productUrls.length} found).`);

    for (const url of toProcess) {
      console.log(`\n  --- Product: ${url} ---`);
      try {
        // 2. Fetch HTML
        console.log("    - Fetching HTML...");
        const html = await fetchHtml(url);

        // 3. Extract with AI
        console.log("    - Extracting data with AI (Ollama)...");
        const productData = await extractDataWithAI(html, 'ministral-3');
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
