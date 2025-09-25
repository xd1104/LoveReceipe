// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://xd1104.github.io/LoveReceipe',
  base: '/LoveReceipe/',
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify('https://ubhpjrfwyzlzueduvypt.supabase.co'),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHBqcmZ3eXpsenVlZHV2eXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODY0NDYsImV4cCI6MjA3NDM2MjQ0Nn0.44gSR2Ujk4kaQEw91HxCm3h6vVEdJRQ7b9kwvGXx6Ok')
    }
  }
});