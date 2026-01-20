# Documentación del Sistema de Scraping

Esta documentación detalla la arquitectura, implementación y estado actual del sistema de scraping de productos deportivos.

## 1. Arquitectura General

El sistema está diseñado para extraer información de productos (nombre, precio, marca, etc.) de sitios de e-commerce de forma eficiente, utilizando un enfoque híbrido entre **Inteligencia Artificial (Ollama)**, **Scraping Tradicional (Cheerio)** y **Selectores Estáticos (Hardcoded)**.

### Flujo de Datos

1.  **Script Ejecutor (`scripts/scrape-test.ts`)**:
    *   Orquesta el proceso.
    *   Itera sobre una lista de URLs de categorías.
    *   Llama al recolector de URLs.
    *   Llama al extractor de datos (usando la estrategia híbrida mejorada).
    *   Envía los datos procesados a la API interna para guardar en base de datos.

2.  **Recolector de URLs (`src/lib/scraper/collector.ts`)**:
    *   **Estrategia VTEX API:** Para sitios reconocidos como VTEX (ej. `sporting.com.ar`, `sportline.com.ar`), utiliza la API pública de búsqueda (`/api/catalog_system/pub/products/search`) para obtener URLs de productos de forma fiable y rápida, evitando problemas de renderizado en el cliente (CSR).
    *   **Estrategia Fallback HTML:** Para sitios desconocidos, intenta buscar enlaces en el HTML que cumplan patrones comunes (ej. terminar en `/p`) o usa JSON-LD.

3.  **Extractor Híbrido (`src/lib/scraper/index.ts`)**:
    *   **Paso 1: Selectores Estáticos (NUEVO):** El sistema verifica si el dominio tiene selectores conocidos (hardcoded) para VTEX u otras plataformas. Si existen, usa Cheerio inmediatamente. Esto hace que el scraping sea **instantáneo** para sitios soportados.
    *   **Paso 2: Generación de Selectores (IA - Fallback):** Si no hay selectores estáticos, se envía el HTML (limpio y recortado) a la IA local (Ollama) para que intente deducir los selectores CSS. *Nota: Esto ha demostrado ser inestable con modelos pequeños locales.*
    *   **Paso 3: Extracción Directa (IA - Fallback Final):** Si todo lo anterior falla, se envía el HTML a la IA pidiendo directamente los datos en formato JSON.

4.  **Backend (`src/pages/api/products.ts`)**:
    *   Endpoint POST que recibe el JSON del producto.
    *   Valida y guarda/actualiza la información en la base de datos PostgreSQL usando Prisma.

## 2. Estado Actual

### Componentes Implementados
*   [x] **Modelo de Base de Datos:** Tabla `Product` creada en `prisma/schema.prisma`.
*   [x] **Endpoint API:** `/api/products` funcional.
*   [x] **Recolector URLs:** Soporte robusto para VTEX (API) y fallback HTML.
*   [x] **Lógica de IA:** Integración con Ollama (`ministral-3` configurado) con timeouts robustos (120s) y limpieza de HTML (`cleanHtmlForLLM`).
*   [x] **Rate Limiting:** Implementado delay de 2s entre peticiones para evitar bloqueos de IP (`ConnectTimeoutError`).
*   [x] **Validación de Selectores:** El sistema detecta si la IA devuelve datos en lugar de selectores y aborta esa estrategia.

### Historial de Cambios y Mejoras (Changelog)

#### [Ultimo Cambio] Estabilización y Selectores Estáticos
*   **Problema:** La IA local (`ministral-3`) sufría timeouts por el tamaño del HTML y alucinaba devolviendo datos en lugar de selectores CSS.
*   **Solución 1 (Optimización):** Se creó `cleanHtmlForLLM` para eliminar scripts, estilos y atributos irrelevantes, reduciendo el payload de 100k+ caracteres a ~20k.
*   **Solución 2 (Robustez):** Se agregó `parseJsonFromAI` para extraer JSON válido incluso si la IA "habla" antes o después. Se aumentaron timeouts a 120s.
*   **Solución 3 (Estrategia):** Se prioriza el uso de selectores estáticos para dominios conocidos (como VTEX) para evitar depender de la IA, dejándola solo como fallback.

## 3. Problemas Conocidos y Soluciones (Troubleshooting)

### A. Error `HeadersTimeoutError` o Timeouts
*   **Causa:** La IA tarda mucho en procesar el HTML o el payload es muy grande.
*   **Solución:** Se implementó `cleanHtmlForLLM` y se aumentaron los timeouts de `fetch`.

### B. Error `ConnectTimeoutError` (Target Website)
*   **Causa:** El sitio web (ej. Sporting) bloquea la IP por hacer muchas peticiones seguidas.
*   **Solución:** Se agregó un `sleep(2000)` (2 segundos) entre cada producto en `scripts/scrape-test.ts`.

### C. La IA devuelve "Unknown" o datos vacíos
*   **Causa:** El modelo local es pequeño y a veces no entiende el contexto o el HTML recortado pierde info vital.
*   **Solución:** Se aumentó el contexto a 30k caracteres y se mejoraron los prompts.

## 4. Próximos Pasos Sugeridos

1.  **Ampliar Base de Selectores:** Agregar más dominios a la lista de selectores estáticos.
2.  **Manejo de Imágenes:** Mejorar la extracción de imágenes (a veces vienen en atributos `data-src` o carruseles).
3.  **Normalización:** Normalizar talles y precios para comparación efectiva.
