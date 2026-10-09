import { defineConfig } from 'astro/config';

// Site 100% estático: o Cloudflare Pages roda `npm run build` e publica a pasta dist/.
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
