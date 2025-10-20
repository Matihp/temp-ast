export type SupportedLocale = "es" | "en";

import { translations, getTranslationModule } from '../translations/index';

// Función para validar y obtener un locale soportado
export function getSupportedLocale(locale: string | undefined): SupportedLocale {
  return (locale === 'es' || locale === 'en') ? locale : 'es';
}

export function getTranslation(locale: SupportedLocale) {
  const t = (key: string): string => {
    return translations[key]?.[locale] || key;
  };

  return t;
}

// Función para obtener traducciones específicas de un módulo
export function getModuleTranslation(module: 'navigation' | 'service' | 'pricing' | 'meta' 
  | 'common' | 'filters' | 'buttons' | 'error' | 'pagination' | 'serviceType' | 'compare'
  , locale: SupportedLocale) {
  const moduleTranslations = getTranslationModule(module);
  
  const t = (key: string): string => {
    return moduleTranslations[key]?.[locale] || key;
  };
  
  return t;
}

export function detectBrowserLanguage(): SupportedLocale {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "en";
  }
  let browserLang;

  if (navigator.language) {
    browserLang = navigator.language.toLowerCase().split("-")[0];
  } else if (navigator.languages && navigator.languages.length) {
    browserLang = navigator.languages[0].toLowerCase().split("-")[0];
  } else {
    browserLang = "en";
  }
  return browserLang === "es" ? "es" : "en";
}

// Función para usar en archivos .astro
export function getLocaleAndTranslations(preferredLocale: string | undefined) {
  const locale = getSupportedLocale(preferredLocale);

  const t = (key: string): string => {
    return translations[key]?.[locale] || key;
  };
  return { locale, t };
}

// Función para formatear fechas según el idioma
export function formatDate(dateStr: string, locale: SupportedLocale): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}