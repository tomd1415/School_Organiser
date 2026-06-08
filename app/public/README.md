# public/

Static assets served at `/static/`.

- `styles.css` — base stylesheet.
- **HTMX** will be vendored here (`htmx.min.js`) in Phase 1, when the Now screen, note
  autosave and inline edits need partial updates. It is deliberately vendored (not a CDN) so
  the app works on the internal LAN with no outbound internet.
