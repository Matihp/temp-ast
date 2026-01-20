import * as cheerio from 'cheerio';
import { extractFromMetadata } from './extractor';
import { enrichProductData } from './enricher';

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  // We return the raw HTML because metadata extraction needs scripts (like application/ld+json)
  return html;
}

/**
 * Aggressively cleans HTML for LLM consumption.
 * Removes all attributes except class, id, src, href to save tokens.
 */
export function cleanHtmlForLLM(html: string): string {
  const $ = cheerio.load(html);

  // Remove scripts, styles, and other heavy elements
  $('script').remove();
  $('style').remove();
  $('svg').remove();
  $('noscript').remove();
  $('iframe').remove();

  // Remove comments
  $.root().find('*').contents().filter((_, el) => el.type === 'comment').remove();

  $('*').each((_, el) => {
    // Keep only specific attributes
    const allowedAttrs = ['class', 'id', 'src', 'href'];
    const attribs = el.attribs;
    if (attribs) {
        Object.keys(attribs).forEach(attr => {
          if (!allowedAttrs.includes(attr)) {
            $(el).removeAttr(attr);
          }
        });
    }
  });

  // Collapse whitespace
  return $.html().replace(/\s+/g, ' ').trim();
}

function parseJsonFromAI<T>(responseText: string): T {
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(`Invalid JSON format in AI response: ${responseText.slice(0, 100)}...`);
    }

    const jsonStr = responseText.slice(jsonStart, jsonEnd + 1);

    try {
        return JSON.parse(jsonStr) as T;
    } catch (parseError) {
        console.error("JSON Parse Error. Raw string:", jsonStr);
        throw parseError;
    }
}

export interface ExtractedProduct {
  name: string;
  brand?: string;
  price?: number;
  size?: string;
  color?: string;
  type?: string;
  gender?: string;
  imageUrl?: string;
}

export interface ProductSelectors {
  name: string;
  brand?: string;
  price: string;
  size?: string;
  color?: string;
  imageUrl?: string;
}

// New unified extraction entry point
export function extractDataWithHybrid(html: string, selectors?: ProductSelectors): ExtractedProduct {
    let result: ExtractedProduct | undefined;

    // 1. First priority: Metadata/JSON-LD (Fastest and most reliable for CSR sites like VTEX)
    const metaData = extractFromMetadata(html);
    if (metaData && metaData.name && metaData.price && metaData.price > 0) {
        result = metaData as ExtractedProduct;
    } else {
        // 2. Second priority: CSS Selectors (if provided)
        if (selectors) {
            const selectorData = extractWithSelectors(html, selectors);
            // If selectors found good data, return it
            if (selectorData.name && selectorData.name !== 'Unknown' && selectorData.price && selectorData.price > 0) {
                // Merge with metadata if we found partial info (e.g. image from meta)
                result = { ...metaData, ...selectorData } as ExtractedProduct;
            }
        }
    }

    // 3. Fallback: Return whatever metadata we found (even if incomplete) or empty
    // The calling script will decide whether to call AI based on this result.
    if (!result) {
        result = (metaData || {
            name: 'Unknown',
            price: 0,
            type: 'unknown',
            gender: 'unknown'
        }) as ExtractedProduct;
    }

    // 4. Enrich data using heuristics (Gender, Type, Color)
    return enrichProductData(result);
}

export function extractWithSelectors(html: string, selectors: ProductSelectors): ExtractedProduct {
  const $ = cheerio.load(html);

  const getText = (sel?: string) => sel ? $(sel).first().text().trim() : undefined;
  const getAttr = (sel?: string, attr: string = 'src') => sel ? $(sel).first().attr(attr) : undefined;

  const rawPrice = getText(selectors.price) || '0';
  // Cleanup price string (remove $, dots/commas handling)
  // Assuming format like $ 10.000 or 10.000,00
  const priceClean = rawPrice.replace(/[^0-9,.]/g, '');
  const price = parseFloat(priceClean.replace(',', '.')); // Simple parse, might need refinement per locale

  return {
    name: getText(selectors.name) || 'Unknown',
    brand: getText(selectors.brand),
    price: isNaN(price) ? 0 : price,
    size: getText(selectors.size),
    color: getText(selectors.color),
    imageUrl: getAttr(selectors.imageUrl, 'src') || getAttr(selectors.imageUrl, 'href'),
    type: 'unknown',
    gender: 'unknown'
  };
}

export async function generateSelectorsWithAI(htmlContent: string, model: string = 'ministral-3'): Promise<ProductSelectors> {
  // Optimize HTML for LLM
  const cleanedHtml = cleanHtmlForLLM(htmlContent);
  // Reduced limit to prevents timeouts (20k chars is usually enough for structure)
  const slicedHtml = cleanedHtml.slice(0, 20000);

  const prompt = `
    Analyze the following HTML snippet of a product page.
    Your task is to identify CSS SELECTORS (classes, ids, or tags) for specific product details.

    DO NOT extract the actual data values (like "$12.999" or "Nike").
    DO NOT return the text content.
    RETURN ONLY THE CSS SELECTORS strings.

    Fields to find selectors for:
    - name: Selector for the product title.
    - brand: Selector for the brand name.
    - price: Selector for the product price.
    - size: Selector for the container of available sizes.
    - color: Selector for the product color name.
    - imageUrl: Selector for the main product image (img tag).

    Return ONLY a JSON object mapping keys to CSS selectors strings.

    CORRECT Example:
    { "name": "h1.title", "price": ".vtex-price", "imageUrl": "img.main-image" }

    INCORRECT Example (DO NOT DO THIS):
    { "name": "Super Shoes 2000", "price": "$ 50.00" }

    HTML:
    ${slicedHtml}
  `;

  // 120s timeout (2 minutes) to give local LLM enough time
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: "json",
        options: {
             num_ctx: 4096 // Ensure sufficient context window
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);

    const data = await res.json() as { response: string };
    const selectors = parseJsonFromAI<ProductSelectors>(data.response);

    // Validate selectors (Must look like selectors, not values)
    const looksLikeSelector = (s: string) => s && (s.startsWith('.') || s.startsWith('#') || s.match(/^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i));

    if (!selectors.name || !looksLikeSelector(selectors.name)) {
         console.warn("AI returned invalid selector for 'name':", selectors.name);
         throw new Error("Invalid selector format for 'name'");
    }
    if (!selectors.price || !looksLikeSelector(selectors.price)) {
         console.warn("AI returned invalid selector for 'price':", selectors.price);
         throw new Error("Invalid selector format for 'price'");
    }

    return selectors;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error generating selectors with AI:", error);
    throw error;
  }
}

// Fallback function
export async function extractDataWithAI(htmlContent: string, model: string = 'ministral-3'): Promise<ExtractedProduct> {
  // Optimize HTML for LLM
  const cleanedHtml = cleanHtmlForLLM(htmlContent);
  // Increased limit slightly to avoid "incomplete snippet" errors
  const slicedHtml = cleanedHtml.slice(0, 30000);

  const prompt = `
    Extract structured product data from this HTML.

    INSTRUCTIONS:
    - Return ONLY valid JSON.
    - Do NOT include any introductory text, markdown code blocks, or explanations.
    - If a field is missing, set it to null or empty string.
    - Fields: name, brand, price (number), size, color, type, gender, imageUrl.

    HTML:
    ${slicedHtml}
  `;

  // 120s timeout (2 minutes)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: "json",
         options: {
             num_ctx: 4096
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);

    const data = await res.json() as { response: string };
    const result = parseJsonFromAI<ExtractedProduct>(data.response);

    // Also enrich AI results just in case
    return enrichProductData(result);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error calling AI:", error);
    throw error;
  }
}
