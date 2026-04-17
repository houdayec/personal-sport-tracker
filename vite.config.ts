import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dynamicImport from 'vite-plugin-dynamic-import'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: ['babel-plugin-macros'],
            },
        }),
        dynamicImport(),
        VitePWA({
            strategies: 'generateSW',
            injectRegister: false,
            manifest: false,
            registerType: 'autoUpdate',
            workbox: {
                navigateFallback: '/index.html',
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                globPatterns: [
                    'index.html',
                    'manifest.webmanifest',
                    'favicon.ico',
                    'logo192.png',
                    'logo512.png',
                    'assets/*.{js,css,woff2,woff,ttf}',
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    assetsInclude: ['**/*.md'],
    resolve: {
        alias: {
            '@': path.join(__dirname, 'src'),
        },
    },
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5174,
    },
})
