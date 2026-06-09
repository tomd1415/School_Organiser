// Convert an Office document to PDF for in-browser preview, via the Gotenberg
// (headless LibreOffice) sidecar. Returns null if the sidecar is absent or the
// conversion fails — callers then fall back to downloading the original.
import { GOTENBERG_URL } from '../config/resources';

export async function convertToPdf(buf: Buffer, filename: string): Promise<Buffer | null> {
  if (!GOTENBERG_URL) return null;
  try {
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buf)]), filename);
    const res = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, { method: 'POST', body: form });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
