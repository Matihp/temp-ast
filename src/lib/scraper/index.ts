import * as cheerio from 'cheerio';

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

  // Basic cleanup to reduce token usage
  const $ = cheerio.load(html);
  $('script').remove();
  $('style').remove();
  $('svg').remove();
  $('header').remove();
  $('footer').remove();
  $('nav').remove();

  // Return the cleaned body text/structure or a portion of it.
  // For AI, passing the 'main' content is usually best.
  // We'll try to grab a reasonable container or just the body text.
  const bodyContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000); // Limit length for context window

  return bodyContent;
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

export async function extractDataWithAI(htmlContent: string, model: string = 'llama3'): Promise<ExtractedProduct> {
  const prompt = `
    You are a helpful assistant that extracts structured product data from raw HTML text.
    Extract the following fields from the text below:
    - name (string): The full name of the product.
    - brand (string): The brand of the product (e.g., Nike, Adidas).
    - price (number): The current price of the product (numeric only, remove currency symbols).
    - size (string): The available sizes or the specific size if mentioned (e.g., "M", "42", "S-XL").
    - color (string): The color of the product.
    - type (string): The type of clothing (e.g., remera, pantalon, zapatillas, buzo).
    - gender (string): The target gender (e.g., hombre, mujer, unisex, niño).
    - imageUrl (string): Main product image URL if found (or null).

    Return ONLY a JSON object. Do not include markdown formatting like \`\`\`json.

    Text to analyze:
    ${htmlContent}
  `;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: "json" // Force JSON mode if supported by the model version
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status}`);
    }

    const data = await res.json() as { response: string };
    const responseText = data.response;

    try {
      // Clean up potential markdown code blocks if the model ignores the instruction
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr) as ExtractedProduct;
    } catch (e) {
      console.error("Failed to parse JSON from AI response:", responseText);
      throw new Error("Invalid JSON response from AI");
    }
  } catch (error) {
    console.error("Error calling AI:", error);
    throw error;
  }
}
