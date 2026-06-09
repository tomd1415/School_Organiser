// Root of the hosted resource file store. A bind-mounted directory shared by the
// app (writes uploads), the bulk-import job (host-side) and backups. Container:
// /data/resources; host: the absolute path in app/.env.
export const RESOURCE_STORE_PATH = process.env.RESOURCE_STORE_PATH ?? '/data/resources';

// Office→PDF preview sidecar (Gotenberg). Empty disables preview, falling back to download.
export const GOTENBERG_URL = process.env.GOTENBERG_URL ?? '';
