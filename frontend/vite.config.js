import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
    host: '0.0.0.0',
    allowedHosts: ['all'],
  },
});
