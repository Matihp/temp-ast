import { fetchHtml, extractDataWithAI } from '../src/lib/scraper/index';

const PRODUCT_URLS = [
  // User provided URLs (these might be category URLs based on the chat, but user agreed to start with product URLs or similar)
  // Let's use the ones provided in the prompt which seem to be category URLs,
  // BUT the user said "si esos que dices esta bien" regarding "starting with product URLs".
  // However, the user also provided category URLs.
  // To avoid 404s or bad parsing on category pages treated as products,
  // I will try to find a real product URL from those sites or use the provided ones and let the AI do its best
  // (though the prompt is tuned for single products).
  //
  // Let's use a hypothetical product URL pattern from those sites for testing if I can't browse.
  // Since I can't browse to find real product URLs, I will put placeholders
  // and instruct the user to replace them with real product URLs,
  // OR I will try to use the category URL and see if the AI can extract *something* (maybe the first product it sees).

  // Actually, the user's plan is: "Iterate list... Scrape... Extract... Save".
  // I will put the URLs the user gave me, even if they are categories, just to test connectivity.
  // Ideally, the user should provide specific product URLs.
  // I'll add a comment about this.

  "https://www.sporting.com.ar/remera-nike-sportswear-club-hombre-6580/p", // Example guessed product URL
  "https://www.sportline.com.ar/remera-nike-sportswear-club-hombre/p" // Example guessed product URL
];

// NOTE: Please replace the URLs above with REAL product detail pages for accurate testing.
// The current logic is designed to extract details from a single product page.

const API_ENDPOINT = 'http://localhost:4321/api/products'; // Assuming Astro runs on 4321 locally

async function run() {
  console.log("Starting scraping job...");

  for (const url of PRODUCT_URLS) {
    console.log(`\nProcessing: ${url}`);
    try {
      // 1. Fetch HTML
      console.log("  - Fetching HTML...");
      const html = await fetchHtml(url);

      // 2. Extract with AI
      console.log("  - Extracting data with AI (Ollama)...");
      // You can change 'llama3' to 'mistral' or whatever model you have pulled
      const productData = await extractDataWithAI(html, 'llama3');
      console.log("    > Extracted:", productData);

      // 3. Save to DB via API
      console.log("  - Saving to database...");
      const saveRes = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productData, url }),
      });

      if (saveRes.ok) {
        console.log("    > Success!");
      } else {
        console.error("    > Failed to save:", await saveRes.text());
      }

    } catch (error) {
      console.error(`  ! Error processing ${url}:`, error);
    }
  }

  console.log("\nJob finished.");
}

run();
