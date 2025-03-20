export interface AdminProAppConfigRaw {
  VITE_GLOB_API_URL: string
}

export interface ApplicationConfig {
  apiURL: string
}

declare global {
  interface Window {
    _ADMIN_PRO_APP_CONF_: AdminProAppConfigRaw
  }
}
