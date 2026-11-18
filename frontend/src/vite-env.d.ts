/// <reference types="vite/client" />

// US-079 路线1：本地 .env 注入的高德 JS Key 与安全密钥（见 .env.example）。
interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string
  readonly VITE_AMAP_SECURITY_JS_CODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}