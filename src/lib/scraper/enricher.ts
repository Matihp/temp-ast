import { type ExtractedProduct } from './index';

// Common clothing types in Spanish
// Order matters! More specific types should be checked first.
const TYPES: Record<string, RegExp> = {
  'camiseta': /camiseta|titular|suplente|alternativa|oficial|jersey|afa|selecci.n/i,
  'remera': /remera|chomba|top/i, // Removed 'camiseta' from here to avoid conflict
  'pantalon': /pantalon|jean|jogger|legging|calza/i,
  'short': /short|bermuda/i,
  'campera': /campera|chaqueta|buzo|canguro|hoodie/i,
  'zapatillas': /zapatilla|botita|calzado/i,
  'accesorio': /gorra|mochila|bolso|media|calcetin/i,
  'conjunto': /conjunto/i,
  'malla': /malla|bikini|traje de ba.o/i
};

// Colors in Spanish
const COLORS: Record<string, RegExp> = {
  'negro': /negro|black/i,
  'blanco': /blanco|white/i,
  'azul': /azul|blue|marino|celeste/i, // Added celeste
  'rojo': /rojo|red|bordo/i,
  'verde': /verde|green/i,
  'gris': /gris|grey/i,
  'rosa': /rosa|pink|fucsia/i,
  'amarillo': /amarillo|yellow/i,
  'naranja': /naranja|orange/i,
  'violeta': /violeta|purple|lila/i,
  'beige': /beige/i,
  'multicolor': /multicolor|estampado/i
};

export function enrichProductData(product: ExtractedProduct): ExtractedProduct {
  const nameLower = product.name.toLowerCase();

  // 1. Deduce Gender
  if (!product.gender || product.gender === 'unknown') {
    if (/\b(hombre|caballero|masculin)\b/i.test(nameLower)) product.gender = 'Hombre';
    else if (/\b(mujer|dama|femenin)\b/i.test(nameLower)) product.gender = 'Mujer';
    else if (/\b(ni.o|ni.a|infantil|junior|bebe)\b/i.test(nameLower)) product.gender = 'Niño/a';
    else if (/\b(unisex)\b/i.test(nameLower)) product.gender = 'Unisex';
    // Default fallback could be Unisex if unspecified, or keep unknown
  }

  // 2. Deduce Type
  if (!product.type || product.type === 'unknown') {
    for (const [type, regex] of Object.entries(TYPES)) {
      if (regex.test(nameLower)) {
        product.type = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize
        break;
      }
    }
  }

  // 3. Deduce Color (Simple heuristic: check if color word is in title)
  // Be careful not to overwrite if already present, unless unknown
  if (!product.color || product.color === 'unknown') {
      for (const [color, regex] of Object.entries(COLORS)) {
          // Check word boundaries to avoid matching inside other words
          if (new RegExp(`\\b${color}\\b`, 'i').test(product.name) || regex.test(product.name)) {
              product.color = color.charAt(0).toUpperCase() + color.slice(1);
              break;
          }
      }
  }

  return product;
}
