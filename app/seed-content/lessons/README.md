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
  cd app && DATABASE_URL=… RESOURCE_STORE_PATH=… npm run seed:lessons        # all bundles (REPLACE)
  cd app && … npm run seed:lessons -- <unit-slug>                            # just one
  cd app && … npm run seed:lessons -- --new-only                             # provision: only units NOT already here
  ```
  Use **`--new-only`** for unattended provisioning (boot hook / cron / a freshly-set-up instance): it creates
  any unit that's missing and **never touches one that already exists**, so a teacher's local edits on that
  instance are never clobbered. Plain `seed:lessons` (replace) is the deliberate "push my updated master" path.

Round-trip is **lossless** (proven): export → wipe → re-seed yields byte-identical plans + resources, with
embedded media re-linked.

## Transferring to a future instance over the internet

The bundles live in git, so **git is the transfer channel** — no extra service needed:

1. Push this repo to a private remote (GitHub / GitLab / self-hosted Gitea).
2. A future instance clones/pulls it as part of its normal deploy (the deploy already does `git pull`).
3. Provision the lessons — pick one:
   - **On first deploy** add `npm run seed:lessons -- --new-only` to the deploy/boot step (right after
     migrations). A brand-new instance then materialises every committed lesson with zero manual steps.
   - **Ongoing**, to pull future conversions automatically, a cron on the instance:
     `git pull --ff-only && npm run seed:lessons -- --new-only` (the `--new-only` guard keeps it safe to run
     on a schedule). Promoting an *updated* master is the deliberate plain `seed:lessons` (replace) instead.

Curriculum content only (no pupil data, no AI) → safe to transmit over the internet. For the binaries at
scale, see git-LFS below (the remote then serves the images/videos over HTTPS too).

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
