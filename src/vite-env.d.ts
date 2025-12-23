/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FRONTIFY_DOMAIN: string;
    readonly VITE_FRONTIFY_BEARER_TOKEN: string;
    readonly VITE_LIBRARY_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}