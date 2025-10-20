import { getTranslation, type SupportedLocale } from './i18n';

interface SEOProps {
  title?: string;
  description?: string;
  locale?: string;
  type?: string;
  image?: string;
  canonicalURL?: string;
  url?: URL;
  site?: URL;
}

export function generateSEOMetadata({
  title = 'AI Pricing',
  description,
  locale = 'es',
  type = 'website',
  image = '/og-image.png',
  canonicalURL,
  url,
  site,
}: SEOProps) {
  // Convertir el locale a SupportedLocale
  const typedLocale = (locale === 'es' || locale === 'en') ? 
    locale as SupportedLocale : 'es' as SupportedLocale;
  
  // Usar getTranslation en lugar de hooks de React
  const t = getTranslation(typedLocale);
  
  // El resto de la función permanece igual
  const metaDescription = description || t('meta.description');
  const canonical = canonicalURL || (url ? url.href : '');
  const imageUrl = site ? new URL(image, site).toString() : image;
  
  return {
    title,
    description: metaDescription,
    canonical,
    openGraph: {
      type,
      url: canonical,
      title,
      description: metaDescription,
      image: imageUrl,
      locale
    },
    twitter: {
      card: "summary_large_image",
      url: canonical,
      title,
      description: metaDescription,
      image: imageUrl
    },
    alternateLanguages: {
      es: site ? new URL(url?.pathname || '', site).href : '',
      en: site ? new URL(url?.pathname || '', site).href : ''
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": title,
      "description": metaDescription,
      "url": canonical,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${canonical}search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    }
  };
}

// Componente para usar en archivos .astro
export function SEO(props: SEOProps) {
  return props;
}