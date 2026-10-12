import process from 'node:process';

import { defineConfig } from '@vben/vite-config';

import { loadEnv } from 'vite';

export default defineConfig(async ({ command, mode }) => {
  const privateProxyTarget =
    command === 'serve'
      ? loadEnv(mode, process.cwd(), 'DEV_').DEV_API_PROXY_TARGET?.trim()
      : undefined;

  if (privateProxyTarget) {
    const target = new URL(privateProxyTarget);
    if (
      target.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost'].includes(target.hostname) ||
      !target.port ||
      target.pathname !== '/' ||
      target.search ||
      target.hash ||
      target.username ||
      target.password
    ) {
      throw new Error(
        'DEV_API_PROXY_TARGET must be a local HTTP origin with a port',
      );
    }
  }

  return {
    application: {},
    vite: {
      server: {
        ...(privateProxyTarget ? { host: '127.0.0.1' } : {}),
        proxy: {
          '/api': {
            changeOrigin: true,
            target: privateProxyTarget || 'http://localhost:8888',
          },
        },
      },
    },
  };
});
