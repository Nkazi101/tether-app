import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: { target: 'es2022' },
    optimizeDeps: { esbuildOptions: { target: 'es2022' } },
    // MUSE_API_KEY is server-only (read by server.ts via dotenv) and must
    // never be inlined into the browser bundle.
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // Keep reading state stable when backend checks or audit receipts change.
      watch: { ignored: ['**/audit/**','**/.playwright-mcp/**','**/build/**','**/dist/**','**/supabase/**','**/tests/**','**/scripts/**','**/docs/**','**/server/**','**/server.ts'] },
      // The Express development server attaches HMR to its HTTP listener.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
