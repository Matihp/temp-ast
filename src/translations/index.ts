import type { SupportedLocale } from "../utils/i18n";


export const translations: Record<string, Record<SupportedLocale, string>> = {
  "common": {
    "en": "Common",
    "es": "Común"
  },
  "navigation": {
    "en": "Navigation",
    "es": "Navegación"
  },
  "service": {
    "en": "Service",
    "es": "Servicio"
  },
  "pricing": {
    "en": "Pricing",
    "es": "Precios"
  },
  "meta": {
    "en": "Meta",
    "es": "Meta"
  },
  "filters": {
    "en": "Filters",
    "es": "Filtros"
  },
  "buttons": {
    "en": "Buttons",
    "es": "Botones"
  },
  "error": {
    "en": "Error",
    "es": "Error"
  },
  "pagination": {
    "en": "Pagination",
    "es": "Paginación"
  },
  "serviceType": {
    "en": "Service Type",
    "es": "Tipo de Servicio"
  },
  "compare": {
    "en": "Compare",
    "es": "Comparar"
  }
};

export function getTranslationModule(module: keyof typeof translations) {
  return translations[module] || {};
}