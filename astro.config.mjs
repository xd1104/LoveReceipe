// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://xd1104.github.io/LoveReceipe',
  vite: {
    plugins: [tailwindcss()]
  }
});