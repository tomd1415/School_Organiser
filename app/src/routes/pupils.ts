import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { createPupil, listPupils, setPupilActive, disposePupil, listDisposals, exportPupilArchive, type RosterEntry } from '../repos/pupils';
import { aiKeyConfigured } from '../llm/client';
import { getSetting } from '../repos/settings';
import {
  listGroupLogins,
  setGroupLoginCode,
  setPupilPin,
  setPupilCredentialEnabled,
  unlockPupil,
  type GroupLogins,
  type PupilLoginRow,
} from '../repos/pupilCredentials';
import { revokeAllDevices } from '../repos/pupilDevices';
import { createNote } from '../repos/notes';
import { renderNoteItem, renderNotesList } from '../lib/notesView';
import { listPupilNotes, pupilMarksHistory, pupilUnits, setUnitSignal, type PupilUnitRow, type UnitSignal } from '../repos/pupilProgress';
import { importRoster } from '../services/misImport';
import { listRosterClasses, classCohort, type CohortPupil, type Level, type AtlTrend } from '../repos/cohort';
import { getClockContext } from '../repos/clock';
import { localParts } from '../lib/time';

// §11 roster card: initials avatar · name · token, with the GDPR actions (archive / SAR export /
// anonymise / erase) tucked into a ⋯ disclosure so the grid stays calm.
function pupilInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0]![0]! + (parts.length > 1 ? parts[parts.length - 1]![0]! : '')).toUpperCase();
}
// The GDPR action menu (archive / SAR export / anonymise / erase) — shared by the flat roster and the
// per-class cohort card.
function pupilActionsMenu(id: number, name: string, token: string, active: boolean): string {
  return `<details class="roster-actions">
      <summary title="manage this pupil" aria-label="manage this pupil">⋯</summary>
      <div class="roster-menu">
        <button type="button" class="link" hx-post="/pupils/${id}/${active ? 'deactivate' : 'activate'}" hx-target="#pupil-${id}" hx-swap="outerHTML">${active ? 'archive' : 'restore'}</button>
        <a class="link" href="/pupils/${id}/export" title="download this pupil's full record (subject-access request)">⬇ data</a>
        <button type="button" class="link" title="leaver: remove name + login, keep cohort data"
          hx-post="/pupils/${id}/anonymise" hx-target="#pupil-${id}" hx-swap="outerHTML"
          hx-confirm="Anonymise ${esc(name)}? Their name, login and 'what works for me' profile are removed; their answers/marks stay but no longer named. This cannot be undone.">anonymise…</button>
        <button type="button" class="link danger" title="permanently erase ALL of this pupil's data"
          hx-post="/pupils/${id}/erase" hx-target="#pupil-${id}" hx-swap="outerHTML"
          hx-prompt="PERMANENT erasure of ${esc(name)} — every answer, mark, feedback, profile and login. Type ${esc(token)} to confirm.">erase…</button>
      </div>
    </details>`;
}

const LEVEL_CHIP: Record<Level, [string, string]> = { support: ['lvl-support', 'Support'], core: ['lvl-core', 'Core'], challenge: ['lvl-challenge', 'Challenge'] };
function levelChip(level: Level | null): string {
  if (!level) return '<span class="lvl-chip lvl-none">no level</span>';
  const [cls, label] = LEVEL_CHIP[level];
  return `<span class="lvl-chip ${cls}">${label}</span>`;
}
const ATL_ARROW: Record<AtlTrend, [string, string, string]> = { up: ['atl-up', '↗', 'improving'], down: ['atl-down', '↘', 'slipping'], flat: ['atl-flat', '→', 'steady'], none: ['', '', ''] };
function atlArrow(trend: AtlTrend): string {
  const [cls, glyph, label] = ATL_ARROW[trend];
  return glyph ? `<span class="atl-arrow ${cls}" title="attitude to learning — ${label}">${glyph}</span>` : '';
}

function renderPupil(p: RosterEntry): string {
  return `<li class="roster-card${p.active ? '' : ' inactive'}" id="pupil-${p.id}">
    <a class="roster-main" href="/pupils/${p.id}">
      <span class="roster-avatar" aria-hidden="true">${esc(pupilInitials(p.displayName))}</span>
      <span class="roster-id"><span class="pupil-name">${esc(p.displayName)}</span><span class="muted pupil-token">${esc(p.aiToken)}</span></span>
    </a>
    ${pupilActionsMenu(p.id, p.displayName, p.aiToken, p.active)}
  </li>`;
}

// §11 cohort card: avatar · name · level chip · completion % · ATL trend arrow, plus the GDPR menu.
function renderCohortPupil(p: CohortPupil): string {
  return `<li class="roster-card${p.active ? '' : ' inactive'}" id="pupil-${p.id}">
    <a class="roster-main" href="/pupils/${p.id}">
      <span class="roster-avatar" aria-hidden="true">${esc(pupilInitials(p.displayName))}</span>
      <span class="roster-id">
        <span class="pupil-name">${esc(p.displayName)}</span>
        <span class="cohort-meta">${levelChip(p.level)}${p.completionPct != null ? `<span class="cohort-pct" title="lessons completed this class">${p.completionPct}%</span>` : ''}${p.assessmentPct != null ? `<span class="cohort-asmt" title="average assessment score">📝 ${p.assessmentPct}%</span>` : ''}${atlArrow(p.atlTrend)}</span>
      </span>
    </a>
    ${pupilActionsMenu(p.id, p.displayName, p.aiToken, p.active)}
  </li>`;
}

// 10.24 — one unit's traffic-light row (🔴 behind / 🟡 on-track / 🟢 exceeding), one tap to set.
const SIGNALS: Array<{ v: UnitSignal; emoji: string; label: string }> = [
  { v: 'behind', emoji: '🔴', label: 'behind' },
  { v: 'on_track', emoji: '🟡', label: 'on track' },
  { v: 'exceeding', emoji: '🟢', label: 'exceeding' },
];
function renderUnitSignal(pupilId: number, u: PupilUnitRow): string {
  const btns = SIGNALS.map(
    (s) => `<button type="button" class="sig-btn${u.signal === s.v ? ' on' : ''}" title="${s.label}" hx-post="/pupils/${pupilId}/unit-signal" hx-vals='{"unit":${u.unitId},"signal":"${s.v}"}' hx-target="#usig-${u.unitId}" hx-swap="outerHTML">${s.emoji}</button>`,
  ).join('');
  return `<li id="usig-${u.unitId}" class="sig-row"><span class="sig-unit"><span class="muted">${esc(u.course)}</span> ${esc(u.title)}</span><span class="sig-btns">${btns}</span></li>`;
}

function renderDisposals(rows: Array<{ aiToken: string; action: string; detail: unknown; createdAt: string }>): string {
  const items = rows
    .map((r) => {
      const counts = Object.entries((r.detail ?? {}) as Record<string, number>)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join(', ');
      return `<li><span class="muted">${esc(r.createdAt.slice(0, 16).replace('T', ' '))}</span> — <strong>${esc(r.action)}</strong> ${esc(r.aiToken)}${counts ? ` <span class="muted">(${esc(counts)})</span>` : ''}</li>`;
    })
    .join('');
  return `<div id="disposal-log">${
    rows.length
      ? `<details class="disposal-log"><summary>Disposal log (${rows.length}) — the audited retention evidence</summary><ul>${items}</ul></details>`
      : ''
  }</div>`;
}

function renderLoginPupil(groupId: number, p: PupilLoginRow): string {
  const status = !p.hasPin
    ? '<span class="muted">no PIN</span>'
    : p.locked
      ? '<span class="pin-locked">🔒 locked</span>'
      : p.enabled
        ? `<span class="pin-ok">● PIN ${p.pin ? esc(p.pin) : 'set'}</span>`
        : `<span class="muted">disabled${p.pin ? ` (PIN ${esc(p.pin)})` : ''}</span>`;
  return `<li class="pupil" id="login-${p.pupilId}">
    <span class="pupil-name">${esc(p.displayName)}</span> ${status}
    <button type="button" class="link" hx-post="/pupils/${p.pupilId}/pin" hx-prompt="New 4–6 digit PIN for ${esc(p.displayName)}" hx-target="#login-${p.pupilId}" hx-swap="outerHTML">${p.hasPin ? 'reset PIN' : 'set PIN'}</button>
    ${p.hasPin ? `<button type="button" class="link" hx-post="/pupils/${p.pupilId}/pin-enabled" hx-vals='{"enabled":"${p.enabled ? 'false' : 'true'}"}' hx-target="#login-${p.pupilId}" hx-swap="outerHTML">${p.enabled ? 'disable' : 'enable'}</button>` : ''}
    ${p.locked ? `<button type="button" class="link" hx-post="/pupils/${p.pupilId}/unlock" hx-target="#login-${p.pupilId}" hx-swap="outerHTML">unlock</button>` : ''}
    ${p.devices > 0 ? `<button type="button" class="link" hx-post="/pupils/${p.pupilId}/forget-devices" hx-target="#login-${p.pupilId}" hx-swap="outerHTML" title="${p.devices} remembered device${p.devices === 1 ? '' : 's'}">📱${p.devices} forget</button>` : ''}
  </li>`;
}

function renderLoginGroup(g: GroupLogins): string {
  return `<div class="login-group" id="login-group-${g.groupId}">
    <h3>${esc(g.groupName)}
      <a class="link" href="/pupils/cards/${g.groupId}" target="_blank" rel="noopener">🖨 login cards</a>
    </h3>
    <label class="stop-label">Class code
      <input class="stop-input" name="code" value="${esc(g.loginCode ?? '')}" placeholder="e.g. ${esc(g.groupName)}-31" autocomplete="off"
        hx-post="/pupils/group/${g.groupId}/code" hx-trigger="input changed delay:700ms, blur" hx-swap="none">
      <span class="note-status" id="code-${g.groupId}-status"></span>
    </label>
    <ul class="pupil-list">${g.pupils.map((p) => renderLoginPupil(g.groupId, p)).join('') || '<li class="muted">No pupils enrolled.</li>'}</ul>
  </div>`;
}

export function registerPupilRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const idParam = z.object({ id: z.coerce.number().int().positive() });

  app.get('/pupils', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    const q = z.object({ class: z.coerce.number().int().positive().optional() }).safeParse(req.query);
    let body: string;
    try {
      const keyNote = (await aiKeyConfigured())
        ? ''
        : ' <strong>No AI key is configured yet</strong>, so nothing is sent anywhere regardless.';
      const privacyBanner = `<p class="privacy-banner">⚑ Individual pupils are <strong>never named or described to any AI service</strong> — only cohort-level prose. Each name maps to a stable token (<code>PUPIL_1</code>…), the only thing any AI feature ever sees.${keyNote}</p>`;

      // §11 class chips select the roster. "All" = the flat management roster; a class = its cohort
      // (level · completion % · ATL trend + ability midpoint).
      const classes = await listRosterClasses();
      const selected = q.success && q.data.class ? classes.find((c) => c.groupCourseId === q.data.class) : undefined;
      const chip = (href: string, label: string, on: boolean, count?: number) =>
        `<a class="chip${on ? ' active' : ''}" href="${href}">${esc(label)}${count != null ? ` <span class="chip-count">${count}</span>` : ''}</a>`;
      const classChips = `<div class="pupil-classchips task-chips">
        ${chip('/pupils', 'All', !selected)}
        ${classes.map((c) => chip(`/pupils?class=${c.groupCourseId}`, `${c.groupName} · ${c.courseName}`, selected?.groupCourseId === c.groupCourseId, c.pupilCount)).join('')}
      </div>`;

      let rosterSection: string;
      if (selected) {
        const today = localParts(new Date(), (await getClockContext()).tz).isoDate;
        const cohort = await classCohort(selected.groupCourseId, today);
        rosterSection = `<div class="cohort-head">
            <h2>${esc(selected.groupName)} <span class="muted">· ${cohort.pupils.length} pupil${cohort.pupils.length === 1 ? '' : 's'} · ${esc(selected.courseName)}</span></h2>
            ${cohort.abilityMidpoint ? `<span class="cohort-anchor">ability midpoint ${levelChip(cohort.abilityMidpoint)}</span>` : ''}
          </div>
          <ul class="pupil-list roster-grid" id="pupil-list">${cohort.pupils.map(renderCohortPupil).join('') || '<li class="muted">No pupils enrolled in this class.</li>'}</ul>`;
      } else {
        const pupils = await listPupils();
        rosterSection = `<form class="pupil-add" hx-post="/pupils" hx-target="#pupil-list" hx-swap="afterbegin" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
            <input type="text" name="name" placeholder="Pupil name…" autocomplete="off" required>
            <button type="submit" class="btn-secondary">Add</button>
          </form>
          <ul class="pupil-list roster-grid" id="pupil-list">${pupils.map(renderPupil).join('')}</ul>
          <details class="mis-import">
            <summary>⬆ Import from MIS (CSV)</summary>
            <p class="muted">Paste a SIMS/Arbor export (or any CSV). Needs a <strong>name</strong> column (or
              Forename + Surname) and a <strong>class/group</strong> column. Re-importing a corrected file is safe —
              pupils and classes are matched by name, never duplicated. Names stay local; nothing is sent anywhere.</p>
            <form hx-post="/pupils/import" hx-target="#mis-result" hx-swap="innerHTML">
              <textarea name="csv" rows="6" placeholder="Name,Class&#10;Alex Smith,8B&#10;Sam Jones,8B" style="width:100%"></textarea>
              <button type="submit" class="btn-secondary">Import</button>
            </form>
            <div id="mis-result"></div>
          </details>
          ${renderDisposals(await listDisposals())}`;
      }

      body = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Pupils (roster)</h1>
        ${privacyBanner}
        ${classChips}
        ${rosterSection}
      </section>`;

      // Phase 8.2: pupil logins, grouped by class. Shown once pupil access is enabled in Settings.
      const pupilOn = (await getSetting('pupil_access_enabled').catch(() => null)) === 'true';
      const logins = pupilOn ? await listGroupLogins() : [];
      const loginSection = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Pupil logins</h1>
        ${
          pupilOn
            ? `<p class="muted">Each class needs a <strong>code</strong>; each pupil a <strong>PIN</strong>. Pupils log in at
                 <a href="/pupil" target="_blank" rel="noopener">/pupil</a> with class code → tap name → PIN. Print login cards per class.</p>
               ${logins.map(renderLoginGroup).join('') || '<p class="muted">No classes in the current year yet.</p>'}`
            : `<p class="muted">Pupil access is <strong>off</strong>. Turn it on in <a href="/settings">Settings → Pupil access</a>
                 once the DPIA is signed off; PIN and class-code controls appear here then.</p>`
        }
      </section>`;
      body += loginSection;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = `<section class="card"><h1>Pupils</h1><p class="muted">Unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Pupils', body, authed: true, csrfToken: csrf }));
  });

  app.post('/pupils', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPupil(await createPupil(b.data.name)));
  });

  // 10.26 — import a roster from an MIS CSV export (idempotent; matched by name).
  app.post('/pupils/import', guard, async (req, reply) => {
    const b = z.object({ csv: z.string().max(1_000_000) }).safeParse(req.body);
    if (!b.success) return reply.code(400).type('text/html').send('<p class="error">Nothing to import.</p>');
    const r = await importRoster(b.data.csv);
    if (!r.ok) return reply.type('text/html').send(`<p class="error">${esc(r.message)}</p>`);
    return reply.type('text/html').send(`<p class="adapt-note">${esc(r.message)}</p><p class="muted"><a href="/pupils">Refresh the roster</a> to see them.</p>`);
  });

  for (const [verb, active] of [
    ['activate', true],
    ['deactivate', false],
  ] as const) {
    app.post(`/pupils/:id/${verb}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setPupilActive(id.data.id, active);
      // Archiving a pupil (a leaver) revokes their remembered devices so they can't resume,
      // mirroring the PIN-reset/disable cascade.
      if (!active) await revokeAllDevices(id.data.id);
      const p = (await listPupils()).find((x) => x.id === id.data.id);
      return reply.type('text/html').send(p ? renderPupil(p) : '');
    });
  }

  // 10.2: leaver anonymise — name/login/profile go, cohort data stays (now nameless). Audited.
  app.post('/pupils/:id/anonymise', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const r = await disposePupil(id.data.id, 'anonymise');
    if (!r) return reply.type('text/html').send('');
    const p = (await listPupils()).find((x) => x.id === id.data.id);
    // Replace the row (now showing the token, archived) and refresh the disposal log out-of-band.
    return reply.type('text/html').send(`${p ? renderPupil(p) : ''}${renderDisposals(await listDisposals()).replace('<div id="disposal-log">', '<div id="disposal-log" hx-swap-oob="true">')}`);
  });

  // 10.2: full right-to-erasure (SAR). Requires the teacher to re-type the pupil's token (via the
  // hx-prompt), so a misclick can't wipe a child's whole record. Audited; the row vanishes.
  app.post('/pupils/:id/erase', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const typed = (req.headers['hx-prompt'] ?? '').toString().trim();
    const p = (await listPupils()).find((x) => x.id === id.data.id);
    if (!p) return reply.type('text/html').send(''); // already gone
    if (typed.toUpperCase() !== p.aiToken.toUpperCase()) {
      // Mismatch → refuse, re-render the row unchanged with a small inline note.
      return reply.type('text/html').send(`${renderPupil(p)}<li class="error" id="erase-err-${p.id}">Erase cancelled — the typed token didn't match ${esc(p.aiToken)}.</li>`);
    }
    await disposePupil(id.data.id, 'erase');
    return reply.type('text/html').send(renderDisposals(await listDisposals()).replace('<div id="disposal-log">', '<div id="disposal-log" hx-swap-oob="true">'));
  });

  // 10.2 / BUG-043: per-pupil SAR export — a complete, PORTABLE ZIP: the full JSON record PLUS every
  // screenshot the pupil submitted, with a manifest of what's included / missing (names shown: own data).
  app.get('/pupils/:id/export', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const archive = await exportPupilArchive(id.data.id);
    if (!archive) return reply.code(404).type('text/html').send('<p class="muted">No such pupil.</p>');
    return reply
      .type('application/zip')
      .header('content-disposition', `attachment; filename="pupil-${id.data.id}-record.zip"`)
      .send(archive.zip);
  });

  // ── 10.24: the per-pupil page — running notes, marks history, per-unit traffic-light. Teacher-only;
  // never AI-bound as an individual. (Note GET /pupils/:id sits after the literal /pupils/cards etc.)
  app.get('/pupils/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const pupil = (await listPupils()).find((p) => p.id === id.data.id);
      if (!pupil) return reply.code(404).type('text/html').send(layout({ title: 'Pupil', body: '<section class="card"><p class="muted">No such pupil.</p></section>', authed: true, csrfToken: csrf }));
      const [notes, history, units] = await Promise.all([listPupilNotes(id.data.id), pupilMarksHistory(id.data.id), pupilUnits(id.data.id)]);
      const noteItems = notes.map((n) => ({ id: n.id, body: n.body, time: n.date, followups: [], rev: n.rev }));
      const histRows = history.length
        ? `<table class="pp-marks"><thead><tr><th>Date</th><th>Course</th><th>Marks</th></tr></thead><tbody>${history
            .map((h) => `<tr><td class="muted">${esc(h.date)}</td><td>${esc(h.course)}</td><td>${h.awarded}/${h.total}</td></tr>`)
            .join('')}</tbody></table>`
        : '<p class="muted">No confirmed marks yet.</p>';
      const unitRows = units.length ? `<ul class="sig-list">${units.map((u) => renderUnitSignal(id.data.id, u)).join('')}</ul>` : '<p class="muted">No units in this pupil\'s courses yet.</p>';
      body = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <p><a href="/pupils">← Pupils</a></p>
        <h1>${esc(pupil.displayName)} <span class="muted pupil-token">${esc(pupil.aiToken)}</span></h1>
        <p class="muted">Your private record for this pupil — running notes, attainment and where they're at per unit. None of this is ever sent to an AI as an individual.</p>

        <h2>Notes</h2>
        <button type="button" class="btn-secondary" hx-post="/pupils/${id.data.id}/note" hx-target="#pupil-notes" hx-swap="afterbegin">＋ New note</button>
        ${renderNotesList('pupil-notes', noteItems)}

        <h2>Progress by unit</h2>
        ${unitRows}

        <h2>Marks history</h2>
        ${histRows}
      </section>`;
    } catch (err) {
      app.log.error({ err }, 'per-pupil page render failed');
      body = '<section class="card"><h1>Pupil</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Pupil', body, authed: true, csrfToken: csrf }));
  });

  app.post('/pupils/:id/note', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const { id: noteId, rev } = await createNote({ kind: 'general', pupilId: id.data.id });
    return reply.type('text/html').send(renderNoteItem({ id: noteId, body: '', time: 'now', followups: [], rev }));
  });

  app.post('/pupils/:id/unit-signal', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z.object({ unit: z.coerce.number().int().positive(), signal: z.enum(['behind', 'on_track', 'exceeding']) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await setUnitSignal(id.data.id, b.data.unit, b.data.signal as UnitSignal);
    const u = (await pupilUnits(id.data.id)).find((x) => x.unitId === b.data.unit);
    return reply.type('text/html').send(u ? renderUnitSignal(id.data.id, u) : '');
  });

  // ── Phase 8.2: pupil login admin (PINs, class codes, lockout, login cards) ──────────────────
  const pinGate = async (reply: import('fastify').FastifyReply): Promise<boolean> => {
    if ((await getSetting('pupil_access_enabled').catch(() => null)) !== 'true') {
      reply.code(403).type('text/html').send('<li class="error">Enable pupil access in Settings first.</li>');
      return false;
    }
    return true;
  };
  const oneLogin = async (pupilId: number, groupId: number): Promise<PupilLoginRow | null> =>
    (await listGroupLogins()).find((g) => g.groupId === groupId)?.pupils.find((p) => p.pupilId === pupilId) ?? null;
  const groupOfPupil = async (pupilId: number): Promise<GroupLogins | null> =>
    (await listGroupLogins()).find((g) => g.pupils.some((p) => p.pupilId === pupilId)) ?? null;

  app.post('/pupils/:id/pin', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const pin = ((req.headers['hx-prompt'] ?? '') as string).trim();
    const g = await groupOfPupil(id.data.id);
    if (!g) return reply.code(404).send('');
    if (!/^\d{4,6}$/.test(pin)) {
      const row = g.pupils.find((p) => p.pupilId === id.data.id)!;
      return reply.type('text/html').send(renderLoginPupil(g.groupId, row).replace('</li>', ' <span class="error">PIN must be 4–6 digits</span></li>'));
    }
    await setPupilPin(id.data.id, pin);
    await revokeAllDevices(id.data.id); // a new PIN invalidates remembered devices (security cascade)
    const row = (await oneLogin(id.data.id, g.groupId))!;
    return reply.type('text/html').send(renderLoginPupil(g.groupId, row).replace('</li>', ' <span class="note-status saved">PIN set ✓</span></li>'));
  });

  app.post('/pupils/:id/pin-enabled', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    const b = z.object({ enabled: z.enum(['true', 'false']) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await setPupilCredentialEnabled(id.data.id, b.data.enabled === 'true');
    if (b.data.enabled === 'false') await revokeAllDevices(id.data.id); // disabling kills remembered devices
    const g = await groupOfPupil(id.data.id);
    const row = g ? await oneLogin(id.data.id, g.groupId) : null;
    return reply.type('text/html').send(g && row ? renderLoginPupil(g.groupId, row) : '');
  });

  app.post('/pupils/:id/unlock', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await unlockPupil(id.data.id);
    const g = await groupOfPupil(id.data.id);
    const row = g ? await oneLogin(id.data.id, g.groupId) : null;
    return reply.type('text/html').send(g && row ? renderLoginPupil(g.groupId, row) : '');
  });

  app.post('/pupils/:id/forget-devices', guard, async (req, reply) => {
    if (!(await pinGate(reply))) return;
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await revokeAllDevices(id.data.id);
    const g = await groupOfPupil(id.data.id);
    const row = g ? await oneLogin(id.data.id, g.groupId) : null;
    return reply.type('text/html').send(g && row ? renderLoginPupil(g.groupId, row) : '');
  });

  app.post('/pupils/group/:id/code', guard, async (req, reply) => {
    if ((await getSetting('pupil_access_enabled').catch(() => null)) !== 'true') return reply.code(403).send('');
    const id = idParam.safeParse(req.params);
    const b = z.object({ code: z.string().max(40) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    if (b.data.code.trim() !== '' && !/^[A-Za-z0-9-]{3,40}$/.test(b.data.code.trim())) {
      return reply.type('text/html').send(`<span class="note-status" id="code-${id.data.id}-status" hx-swap-oob="true">letters, numbers, –</span>`);
    }
    try {
      await setGroupLoginCode(id.data.id, b.data.code);
      return reply.type('text/html').send(`<span class="note-status saved" id="code-${id.data.id}-status" hx-swap-oob="true">saved ✓</span>`);
    } catch {
      return reply.type('text/html').send(`<span class="note-status" id="code-${id.data.id}-status" hx-swap-oob="true">that code is taken</span>`);
    }
  });

  // Printable login cards for a class (one per pupil with a PIN) — A6-ish cards, code + name.
  app.get('/pupils/cards/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const g = (await listGroupLogins()).find((x) => x.groupId === id.data.id);
    if (!g) return reply.code(404).type('text/html').send('Class not found.');
    const cards = g.pupils
      .filter((p) => p.hasPin)
      .map(
        (p) => `<div class="login-card">
          <div class="lc-school">School Organiser — my login</div>
          <div class="lc-row"><span class="lc-k">Web page</span><span class="lc-v">${esc((req.headers.host ?? '') + '/pupil')}</span></div>
          <div class="lc-row"><span class="lc-k">Class code</span><span class="lc-v big">${esc(g.loginCode ?? '(set a code)')}</span></div>
          <div class="lc-row"><span class="lc-k">Your name</span><span class="lc-v">${esc(p.displayName)}</span></div>
          <div class="lc-row"><span class="lc-k">PIN</span><span class="lc-v big">${p.pin ? esc(p.pin) : '____ (reset PIN to show)'}</span></div>
          <div class="lc-note">Keep your PIN to yourself.</div>
        </div>`,
      )
      .join('');
    const cssHtml = '<link rel="stylesheet" href="/static/styles.css">';
    const bodyAttr = 'class="cards-page" data-shell="next"';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Login cards · ${esc(g.groupName)}</title>
      ${cssHtml}</head>
      <body ${bodyAttr}><div class="cards-toolbar"><button onclick="window.print()">🖨 Print</button> ${esc(g.groupName)} — login cards</div>
      <div class="login-cards">${cards || '<p>No pupils have a PIN yet — set PINs first.</p>'}</div></body></html>`;
    return reply.type('text/html').send(html);
  });
}
