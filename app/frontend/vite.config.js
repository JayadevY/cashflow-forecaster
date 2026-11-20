import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for Daily Cash-Flow Forecaster
// Runs on port 5173 with hot module reloading
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
