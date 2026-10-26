import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // os testes de SQL (supabase/tests) têm runner próprio: npm run test:sql
  test: { include: ['src/**/*.test.{js,jsx}'] },
})
