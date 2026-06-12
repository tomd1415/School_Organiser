# Investigation — formats pupils can fill in and return *(2026-06-12)*

The ask: worksheets pupils complete **on the computer** and **return to the teacher**, better than
the current Markdown→Word path. Decision deliberately **on hold until the pupil-login project**;
this note records the options so that decision is quick when it comes.

## Where we are today

Generated worksheets are Markdown (formatted beautifully in-app) exported to **.docx** with typed
answer tables. Word's rendering is plainer than the in-app view and needs manual collection
(Teams/shared drive). Layout polish (cell padding, roomier answer rows, 38/62 question/answer
split) landed 2026-06-12.

## The options

| Option | Pupils fill in with | Returns to teacher | Effort | Notes |
|---|---|---|---|---|
| **A. In-app HTML worksheets (pupil logins)** | browser, school network | **automatic** — answers stored per pupil in the DB | M–L, needs pupil auth | The end-game. Answers become *data*: per-pupil completion feeds the feedback loop, auto-marks tick-boxes, and the teacher sees who's stuck live. Fits the deferred pupil-facing project exactly. The existing renderer already produces the HTML; add input fields per answer cell + a pupil session. |
| **B. Fillable PDF (AcroForm fields)** | any PDF reader | file handed back (Teams/drive) | M | Universal and tidy print/layout, but generating form fields dependency-free means hand-rolling PDF objects (heavier than the DOCX writer); answers come back as files, not data. |
| **C. DOCX with content controls** | Word | file handed back | S–M | Upgrade of today's path: real form controls (rich-text boxes, checkboxes) instead of empty cells — harder for pupils to break the layout. Same collection problem. |
| **D. Microsoft Forms / Teams assignment** | browser | Teams handles collection + basic marking | S (manual), M (export) | School already lives in Teams. Cheapest useful step: a "copy as Forms questions" export from a worksheet. No new infrastructure, but answers live in Microsoft's world, not the app's. |
| **E. ODT (LibreOffice)** | LibreOffice | file handed back | S | Same class as C; only worth it if pupils lack Word. |

## Recommendation

1. **Now (done):** keep Markdown + polished DOCX export; collect via Teams as today.
2. **When pupil logins land: build A.** It's the only option where answers become data the app can
   use (completion tracking, feedback loop, less marking). The renderer, differentiation levels
   and per-class resources are already in place — A is mostly auth + an answers table + an input
   variant of the worksheet renderer.
3. **Optional bridge before then:** C (content controls) if Word layout keeps niggling, or D if
   collection is the bigger pain than layout.

Tracked on the after-Phase-6 list (PHASE_6_PLAN §12).
