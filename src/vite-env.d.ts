/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenPanel project client id; public, and optional in local runs */
  readonly VITE_OPENPANEL_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
