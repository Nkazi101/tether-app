import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // The Vercel Supabase integration supplies unprefixed/Next.js public settings.
  // Map only the public URL and browser key; privileged keys stay server-only.
  const env = loadEnv(mode, process.cwd(), [
    'VITE_', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_',
  ]);
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY
    || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    plugins: [react(), tailwindcss()],
    define: {
      ...(supabaseUrl ? {'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl)} : {}),
      ...(supabaseKey ? {'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey)} : {}),
    },
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
