import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                portal: resolve(__dirname, 'portal.html'),
                admin: resolve(__dirname, 'admin.html'),
            },
        },
    },
});
