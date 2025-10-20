# Astro Starter Kit: Basics

```sh
pnpm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## 🚀 Scripts y Comandos Útiles

Esta sección detalla los comandos más comunes para desplegar el proyecto y gestionar la base de datos.

### Cloudflare Pages

Comandos para la gestión del despliegue en Cloudflare.

```bash
# Genera la build de producción y la sirve localmente
# (Ideal para probar cómo se verá en Cloudflare)
pnpm run preview

# Despliega la última versión del proyecto a Cloudflare Pages
pnpm run deploy
```

### Prisma

**Instalación (Solo una vez)**

```bash
# 1. Instalar Prisma CLI como dependencia de desarrollo
pnpm i prisma --save-dev

# 2. Inicializar Prisma en el proyecto
# (Crea la carpeta /prisma, el archivo schema.prisma y el .env)
npx prisma init
```

**Desarrollo (Uso habitual)**

```bash
# (Recomendado) Inicia el modo desarrollo:
# Vigila cambios en 'schema.prisma', aplica migraciones y genera el cliente.
npx prisma dev

# "Empuja" el estado actual de tu 'schema.prisma' a la BD
# (Útil para prototipado, no crea archivos de migración)
npx prisma db push

# Genera (o re-genera) el Prisma Client manualmente
# (Necesario después de hacer cambios en 'schema.prisma' si no usas 'prisma dev')
npx prisma generate
```

**Herramientas Adicionales**

```bash
# Abre Prisma Studio en el navegador
# (Una GUI para ver y editar los datos de tu base de datos)
npx prisma studio
```