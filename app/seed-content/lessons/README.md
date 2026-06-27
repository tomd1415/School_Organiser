# Converted lesson bundles (committed curriculum content)

Each subfolder is one **converted unit** — hand-authored native lessons (see
[../../../docs/LESSON_CONVERSION_GUIDE.md](../../../docs/LESSON_CONVERSION_GUIDE.md)) exported as a
**committable, instance-independent bundle**. This is how converted lessons live in git **and** transfer to
a new instance. Curriculum content only — **no pupil data, no AI** — so it's safe to commit.

## A bundle

```
<unit-slug>/
  manifest.json     # unit title, target course {name, keyStage}, and each lesson's
                    #   title / objectives / outline + its resource list
  l1-…-worksheet.md # the worksheet/slides MARKDOWN (embedded media as {{res:<file>}} placeholders)
  l1-…-slides.md
  l1-…-board.png    # embedded images / videos (binary), referenced by the placeholders
  l1-…-video.mp4
```

The markdown's embedded media use `{{res:<file>}}` placeholders (not `/resources/<id>/view`) so the bundle
carries no instance-specific resource ids; the seed re-resolves them to fresh ids on import.

## Workflow

- **Export** a converted unit from a working instance into a bundle (then `git add` it):
  ```bash
  cd app && DATABASE_URL=… RESOURCE_STORE_PATH=… npm run export-lesson-unit -- <unitId>
  ```
- **Seed / transfer** every committed bundle onto an instance (idempotent — re-running REPLACES a unit of
  the same title on its target scheme; the target course must exist):
  ```bash
  cd app && DATABASE_URL=… RESOURCE_STORE_PATH=… npm run seed:lessons        # all bundles
  cd app && … npm run seed:lessons -- <unit-slug>                            # just one
  ```

Round-trip is **lossless** (proven): export → wipe → re-seed yields byte-identical plans + resources, with
embedded media re-linked.

## Binary assets at scale (git-LFS)

A few hundred KB per unit is fine in plain git for now. Across hundreds of units the embedded images/videos
add up — when that happens, move just these binaries to **git-LFS** (one-off, no bundle-layout change):

```bash
git lfs install
git lfs track "app/seed-content/lessons/**/*.png" "app/seed-content/lessons/**/*.jpg" \
              "app/seed-content/lessons/**/*.jpeg" "app/seed-content/lessons/**/*.mp4" "app/seed-content/lessons/**/*.webm"
git add .gitattributes && git add --renormalize app/seed-content
```

(git-LFS is **not** installed on this dev box yet, so the rule isn't added — the binaries commit as normal
blobs. Add the rule above once LFS is available.)
