# Documentación del Sistema de Scraping

Esta documentación detalla la arquitectura, implementación y estado actual del sistema de scraping de productos deportivos.

## 1. Arquitectura General

El sistema está diseñado para extraer información de productos (nombre, precio, marca, etc.) de sitios de e-commerce de forma eficiente, utilizando un enfoque híbrido entre **Inteligencia Artificial (Ollama)** y **Scraping Tradicional (Cheerio)**.

### Flujo de Datos

1.  **Script Ejecutor (`scripts/scrape-test.ts`)**:
    *   Orquesta el proceso.
    *   Itera sobre una lista de URLs de categorías.
    *   Llama al recolector de URLs.
    *   Llama al extractor de datos (usando la estrategia híbrida).
    *   Envía los datos procesados a la API interna para guardar en base de datos.

2.  **Recolector de URLs (`src/lib/scraper/collector.ts`)**:
    *   **Estrategia VTEX API:** Para sitios reconocidos como VTEX (ej. `sporting.com.ar`, `sportline.com.ar`), utiliza la API pública de búsqueda (`/api/catalog_system/pub/products/search`) para obtener URLs de productos de forma fiable y rápida, evitando problemas de renderizado en el cliente (CSR).
    *   **Estrategia Fallback HTML:** Para sitios desconocidos, intenta buscar enlaces en el HTML que cumplan patrones comunes (ej. terminar en `/p`) o usa JSON-LD.

3.  **Extractor Híbrido (`src/lib/scraper/index.ts`)**:
    *   **Paso 1: Generación de Selectores (IA):** Para el *primer* producto de un dominio nuevo, se envía el HTML (limpio y recortado) a la IA local (Ollama). Se le pide que identifique los **Selectores CSS** (ej. `.product-name`, `#price`) correspondientes a los datos.
    *   **Paso 2: Extracción Rápida (Cheerio):** Se guardan esos selectores en memoria caché. Para los siguientes productos del mismo dominio, se usa `cheerio` con esos selectores para extraer el texto instantáneamente, sin llamar a la IA.
    *   **Paso 3: Fallback (IA):** Si la extracción rápida falla (datos vacíos o inválidos), se recurre al método antiguo: pedirle a la IA que extraiga los datos directamente del HTML.

4.  **Backend (`src/pages/api/products.ts`)**:
    *   Endpoint POST que recibe el JSON del producto.
    *   Valida y guarda/actualiza la información en la base de datos PostgreSQL usando Prisma.

## 2. Estado Actual

### Componentes Implementados
*   [x] **Modelo de Base de Datos:** Tabla `Product` creada en `prisma/schema.prisma`.
*   [x] **Endpoint API:** `/api/products` funcional.
*   [x] **Recolector URLs:** Soporte robusto para VTEX (API) y fallback HTML.
*   [x] **Lógica de IA:** Integración con Ollama (`ministral-3` configurado).
*   [x] **Lógica Híbrida:** Implementada caché de selectores y reintentos.
*   [x] **Script de Prueba:** `npm run scrape` (`scripts/scrape-test.ts`) configurado para procesar hasta 50 productos por categoría.

### Cómo Ejecutar

1.  **Levantar Base de Datos y Servidor:**
    Asegúrate de que tu servidor Astro esté corriendo para recibir los datos en la API.
    ```bash
    npm run dev
    ```
    *(Debe estar escuchando en `http://localhost:4321`)*.

2.  **Levantar Ollama:**
    Asegúrate de tener Ollama corriendo localmente.
    ```bash
    ollama serve
    ```
    *(Modelo requerido: `ministral-3` o el que esté configurado en `src/lib/scraper/index.ts`).*

3.  **Correr Scraper:**
    En otra terminal:
    ```bash
    npm run scrape
    ```

## 3. Problemas Conocidos y Soluciones (Troubleshooting)

### A. Lentitud en el primer producto
*   **Causa:** La IA analiza el HTML para generar selectores. Esto depende 100% de la CPU/GPU local.
*   **Mitigación:** Se implementó el modo híbrido. Solo el primer producto debería ser lento. Los siguientes 49 deberían ser rápidos (milisegundos) si los selectores generados son correctos.

### B. Error `ECONNREFUSED` al guardar
*   **Síntoma:** `Error connecting to API. Make sure Astro is running...`
*   **Causa:** El script `scrape-test.ts` intenta enviar los datos a `http://localhost:4321/api/products` pero nadie está escuchando ahí.
*   **Solución:** Ejecutar `npm run dev` en una terminal paralela.

### C. Selectores Vacíos (`Generated selectors: {}`)
*   **Causa:** La IA no pudo entender el HTML o el HTML estaba demasiado recortado.
*   **Solución Actual:** El sistema hace fallback a `extractDataWithAI` (extracción directa).
*   **Mejora Futura:** Refinar el prompt de generación de selectores o aumentar el contexto HTML (ya se aumentó a 50k caracteres).

### D. "No products found" (0 URLs)
*   **Causa:** El sitio usa renderizado cliente (JS) y Cheerio no ve los enlaces en el HTML inicial.
*   **Solución Aplicada:** Se cambió a usar la API de búsqueda de VTEX para `sporting` y `sportline`, lo cual solucionó el problema devolviendo 50 productos correctamente.

## 4. Próximos Pasos Sugeridos

1.  **Persistencia de Selectores:** Guardar los selectores exitosos en la base de datos (tabla `SiteConfig`?) para no tener que generarlos cada vez que se corre el script, haciendo el proceso rápido desde el producto 1.
2.  **Manejo de Imágenes:** Mejorar la extracción de imágenes (a veces vienen en atributos `data-src` o carruseles).
3.  **Normalización:** Normalizar talles y precios para comparación efectiva.
