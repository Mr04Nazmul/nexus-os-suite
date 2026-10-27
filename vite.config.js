import {defineConfig} from 'vite';
export default defineConfig({base:process.env.PAGES_BUILD?'/nexus-os-suite/':'/',worker:{format:'es'},build:{target:'es2022'}});
