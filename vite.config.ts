import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `--mode https` adds a self-signed certificate so phones on the LAN get a
// secure context (required for microphone + speech recognition).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
