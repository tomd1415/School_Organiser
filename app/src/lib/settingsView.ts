import { esc } from './html';
import { AI_FEATURES, MODEL_OPTIONS } from '../llm/features';
import type { TaAccount } from '../repos/taAccounts';

export function renderTaAccount(a: TaAccount, staff: { id: number; name: string }[]): string {
  const staffName = a.staffId != null ? (staff.find((s) => s.id === a.staffId)?.name ?? null) : null;
  return `<li class="pupil${a.active ? '' : ' inactive'}" id="ta-acct-${a.id}">
    <span class="pupil-name">${esc(a.name)}</span>
    ${staffName ? `<span class="muted">↔ ${esc(staffName)}</span>` : '<span class="muted">no staff link</span>'}
    <button type="button" class="link" hx-post="/settings/ta-account/${a.id}/active" hx-vals='{"active":"${a.active ? 'false' : 'true'}"}' hx-target="#ta-acct-${a.id}" hx-swap="outerHTML">${a.active ? 'disable' : 'enable'}</button>
    <button type="button" class="link" hx-post="/settings/ta-account/${a.id}/password" hx-prompt="New password for ${esc(a.name)} (8+ characters)" hx-target="#ta-acct-${a.id}" hx-swap="outerHTML">reset password</button>
    <button type="button" class="link danger" hx-post="/settings/ta-account/${a.id}/delete" hx-confirm="Delete ${esc(a.name)}'s login?" hx-target="#ta-acct-${a.id}" hx-swap="outerHTML">✕</button>
  </li>`;
}

export function renderFeatureModelPicker(overrides: Record<string, string>): string {
  const rows = AI_FEATURES.map((f) => {
    const sel = overrides[f.key] ?? '';
    const opts = [`<option value=""${sel === '' ? ' selected' : ''}>Default — ${f.role} model</option>`]
      .concat(MODEL_OPTIONS.map((m) => `<option value="${m.id}"${sel === m.id ? ' selected' : ''}>${esc(m.label)}</option>`))
      .join('');
    return `<label class="adapt-l">${esc(f.label)}${f.note ? ` <span class="muted">(${esc(f.note)})</span>` : ''}
      <select hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_feature_${f.key}","value":event.target.value}' hx-trigger="change" hx-swap="none">${opts}</select></label>`;
  }).join('');
  return `<details class="ai-feature-models">
    <summary>Per-feature models (advanced)</summary>
    <p class="muted">Every feature uses its role model above by default. Override one if you want it
      cheaper or stronger — e.g. dial a feature down to Haiku, or push scheme authoring to Opus. Only
      models we have pricing for are listed, so the spend cap stays accurate. Tiers: <strong>Opus</strong>
      strongest/priciest · <strong>Sonnet</strong> balanced · <strong>Haiku</strong> fastest/cheapest.</p>
    ${rows}
    <span class="note-status" id="ai-feat-status"></span>
  </details>`;
}

export interface SettingsPageOptions {
  csrf: string;
  envManaged: boolean;
  school: string | null;
  aiEnabled: string | null;
  cap: string | null;
  mPlan: string | null;
  mDesign: string | null;
  mCheap: string | null;
  emHost: string | null;
  emPort: string | null;
  emUser: string | null;
  emPass: boolean; // whether password is set (do not send actual password to UI)
  emFolder: string | null;
  emTls: string | null;
  emOn: string | null;
  emMins: string | null;
  emLast: string | null;
  aiKeySet: boolean;
  aiKeyFromSettings: boolean;
  AI_KEY_ENV_MANAGED: boolean;
  stylePrefs: string | null;
  featurePrefs: string | null;
  reviewOn: string | null;
  reviewSweep: string | null;
  pupilOn: string | null;
  pupilIdle: string | null;
  dpiaAck: string | null;
  taLegacy: string | null;
  taAccounts: TaAccount[];
  staffRows: { id: number; name: string }[];
  marksOn: string | null;
  marksAck: string | null;
  teacherIdle: string | null;
  backupVerified: string | null;
  health: { years: number; current: string | null; aiMonth: number; dbMb: number };
  spendNote: string;
  navDailySet: Set<string>;
  NAV_MODEL: readonly any[];
  featureModelPickerHtml: string;
}

export function renderSettingsPage(options: SettingsPageOptions): string {
  const {
    csrf,
    envManaged,
    school,
    aiEnabled,
    cap,
    mPlan,
    mDesign,
    mCheap,
    emHost,
    emPort,
    emUser,
    emPass,
    emFolder,
    emTls,
    emOn,
    emMins,
    emLast,
    aiKeySet,
    aiKeyFromSettings,
    AI_KEY_ENV_MANAGED,
    stylePrefs,
    featurePrefs,
    reviewOn,
    reviewSweep,
    pupilOn,
    pupilIdle,
    dpiaAck,
    taLegacy,
    taAccounts,
    staffRows,
    marksOn,
    marksAck,
    teacherIdle,
    backupVerified,
    health,
    spendNote,
    navDailySet,
    NAV_MODEL,
    featureModelPickerHtml,
  } = options;

  return `
    <section class="card setup" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="ld-notes-head" style="margin-bottom: 12px;">
        <div>
          <p class="eyebrow" style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #666);">Prep & Advanced</p>
          <h1 style="margin: 0;">Settings</h1>
        </div>
      </div>

      <h2>School</h2>
      <label class="stop-label">School name
        <input class="stop-input" name="value" value="${esc(school ?? '')}"
          hx-post="/settings/school" hx-trigger="input changed delay:700ms, blur" hx-swap="none">
        <span class="note-status" id="school-status"></span>
      </label>

      <h2>Navigation</h2>
      <p class="muted">Pick which links stay on the always-visible bar; the rest fold into the
        "⚙ Setup &amp; admin" menu. Default: Now, Focus, Timetable, Tasks, Captured.</p>
      <form class="setup-add nav-config" hx-post="/settings/nav" hx-target="#nav-status" hx-swap="innerHTML">
        ${NAV_MODEL.map((i) => `<label class="nav-config-item"><input type="checkbox" name="daily" value="${esc(i.href)}"${navDailySet.has(i.href) ? ' checked' : ''}> ${esc(i.label)}</label>`).join('')}
        <button type="submit" class="btn-secondary">Save navigation</button>
        <span class="note-status" id="nav-status"></span>
      </form>


      <h2>Password</h2>
      ${
        envManaged
          ? '<p class="muted">This instance\'s password is managed by <code>APP_PASSWORD_HASH</code> in its <code>.env</code> file (regenerate with <code>npm run hash-password</code>). Remove that variable to manage it here instead.</p>'
          : `<form class="setup-add" hx-post="/settings/password" hx-target="#pw-result" hx-swap="innerHTML">
              <input type="password" name="current" placeholder="current password" required autocomplete="current-password">
              <input type="password" name="next" placeholder="new password (8+)" required minlength="8" autocomplete="new-password">
              <input type="password" name="next2" placeholder="new password again" required autocomplete="new-password">
              <button type="submit" class="btn-secondary">Change password</button>
            </form><div id="pw-result"></div>`
      }
      <div class="setup-add">
        <label>Auto-logout after <input class="setup-num" style="width:4rem" value="${esc(teacherIdle ?? '30')}"
          hx-post="/settings/teacher-idle" hx-vals='js:{"value":event.target.value}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"> min of inactivity
          <span class="muted">(your own session — 0 disables; protects an unattended classroom laptop)</span></label>
        <span class="note-status" id="teacher-idle-status"></span>
      </div>

      <h2>AI</h2>
      <p class="muted">Key: ${aiKeySet ? `✅ set (${AI_KEY_ENV_MANAGED ? 'via .env' : 'in Settings'})` : '— not set; all AI features degrade gracefully'} ·
        provider: <strong>Anthropic (Claude)</strong> · every call is redacted, safeguarding-withheld and audited regardless.</p>
      ${spendNote}
      ${
        AI_KEY_ENV_MANAGED
          ? '<p class="muted">The API key is managed by <code>ANTHROPIC_API_KEY</code> in this instance\'s <code>.env</code>. Remove that variable to set the key here instead.</p>'
          : `<form class="setup-add" hx-post="/settings/ai-key" hx-target="#ai-key-result" hx-swap="innerHTML" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
              <input type="password" name="key" placeholder="${aiKeyFromSettings ? 'replace stored Anthropic API key' : 'paste your Anthropic API key (sk-ant-…)'}" autocomplete="off">
              <button type="submit" class="btn-secondary">${aiKeyFromSettings ? 'Update key' : 'Save key'}</button>
              ${aiKeyFromSettings ? '<button type="submit" class="link danger" name="clear" value="1" formnovalidate>remove key</button>' : ''}
            </form>
            <p class="muted">Stored in this instance's database (LAN-only), like the email password. Get a key from <code>console.anthropic.com</code>.</p>
            <div id="ai-key-result"></div>`
      }
      <div class="setup-add">
        <label><input type="checkbox"${aiEnabled !== 'false' ? ' checked' : ''}
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_enabled","value":event.target.checked ? "true" : "false"}' hx-trigger="change" hx-swap="none"> AI features enabled</label>
        <label>Monthly cap (pence) <input class="setup-num" style="width:6rem" value="${esc(cap ?? '')}" placeholder="default"
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_month_cap_pence","value":event.target.value}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"></label>
      </div>
      <div class="setup-add">
        <label>Design model <input value="${esc(mDesign ?? '')}" placeholder="claude-opus-4-8"
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_design","value":event.target.value}' hx-trigger="change" hx-swap="none"></label>
        <label>Planning model <input value="${esc(mPlan ?? '')}" placeholder="claude-sonnet-4-6"
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_plan","value":event.target.value}' hx-trigger="change" hx-swap="none"></label>
        <label>Cheap model <input value="${esc(mCheap ?? '')}" placeholder="claude-haiku-4-5"
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_model_cheap","value":event.target.value}' hx-trigger="change" hx-swap="none"></label>
      </div>
      ${featureModelPickerHtml}
      <div class="setup-add" style="flex-direction:column;align-items:stretch;max-width:42rem">
        <label><input type="checkbox"${reviewOn === 'true' ? ' checked' : ''}
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_review_enabled","value":event.target.checked ? "true" : "false"}' hx-trigger="change" hx-swap="none">
          AI lesson reviewer <strong>(off by default)</strong></label>
        <p class="muted">A second opinion on an <strong>upcoming, not-yet-taught</strong> lesson, judged against the
          spec and any uploaded documents. It only ever <em>suggests</em> — you Apply or Dismiss each review on the
          Schemes page; the master lesson is never changed automatically. Runs on the <strong>Planning</strong> model
          by default (Sonnet); push "Review a lesson" to Opus above for a deeper, pricier review. Manual-trigger only,
          and a whole-unit sweep self-stops at the monthly cap.</p>
        <label>Nightly auto-review
          <input type="number" min="0" max="10" value="${esc(reviewSweep ?? '0')}" style="width:4rem"
            hx-post="/settings/ai" hx-vals='js:{"key":"ai_review_sweep_daily","value":event.target.value}' hx-trigger="change" hx-swap="none">
          lessons/night <span class="muted">(0 = off; needs the reviewer on above; runs once early each morning, capped by the monthly budget)</span></label>
      </div>
      <p class="muted">Standing instructions sent with every lesson/scheme/resource generation
        (cohort-level — <strong>never name a pupil</strong>). Style shapes <em>how</em> things are
        written; features are things to always include where they fit, without lengthening the lesson.</p>
      <div class="setup-add" style="flex-direction:column;align-items:stretch;max-width:42rem">
        <label>Style preferences<br><textarea name="value" rows="3" maxlength="2000" placeholder="e.g. plain step-by-step language, UK spelling, short sentences, define new words"
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_style_prefs"}' hx-trigger="input changed delay:800ms, blur" hx-swap="none">${esc(stylePrefs ?? '')}</textarea></label>
        <label>Always-include features<br><textarea name="value" rows="3" maxlength="2000" placeholder="e.g. a retrieval starter, a clear learning objective, a plenary check"
          hx-post="/settings/ai" hx-vals='js:{"key":"ai_feature_prefs"}' hx-trigger="input changed delay:800ms, blur" hx-swap="none">${esc(featurePrefs ?? '')}</textarea></label>
      </div>
      <span class="note-status" id="ai-status"></span>

      <h2>TA access</h2>
      <p class="muted">Each TA gets their <strong>own password</strong> for the normal login page and lands on a
        <strong>read-only view of the current lesson</strong> (plan + resources, peek at the next) with a feedback form —
        nothing else is reachable. Feedback shows on your lesson page and feeds the adapt-next-lesson AI
        (safeguarding-flagged feedback stays out of AI). Linking a TA to their staff row adds a
        <strong>"my upcoming lessons"</strong> tab to their view.</p>
      <ul class="pupil-list" id="ta-accounts">${taAccounts.map((a) => renderTaAccount(a, staffRows)).join('') || '<li class="muted">No TA accounts yet.</li>'}</ul>
      <form class="setup-add" hx-post="/settings/ta-account" hx-target="#ta-accounts" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
        <input name="name" placeholder="TA name" required maxlength="80">
        <select name="staff">
          <option value="">— staff link (optional) —</option>
          ${staffRows.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
        </select>
        <input type="password" name="password" placeholder="their password (8+)" minlength="8" required autocomplete="new-password">
        <button type="submit" class="btn-secondary">Add TA account</button>
      </form>
      <div id="ta-pw-result">${
        taLegacy && taLegacy.trim() !== ''
          ? `<p class="muted">⚠ The old <strong>shared TA password</strong> is still set and still works.
              Once every TA has their own account above, retire it:
              <button type="button" class="link danger" hx-post="/settings/ta-password" hx-vals='{"clear":"1"}' hx-target="#ta-pw-result" hx-swap="innerHTML">clear shared password</button></p>`
          : ''
      }</div>

      <h2>Pupil access</h2>
      <p class="muted">Pupils log in with <strong>class code → tap your name → PIN</strong> and see only <code>/me</code>:
        their class's live worksheet to type into, a Done ✓ button and a quick lesson-feedback widget. Manage PINs and
        class codes on the <a href="/pupils">Pupils page</a>.</p>
      ${
        pupilOn === 'true'
          ? `<p class="adapt-note">✅ Pupil access is <strong>enabled</strong>${dpiaAck ? ` (DPIA sign-off acknowledged ${esc(dpiaAck.slice(0, 10))})` : ''}.
              <button type="button" class="link danger" hx-post="/settings/pupil-access" hx-vals='{"enable":"false"}' hx-swap="none" hx-on::after-request="location.reload()">Disable</button></p>`
          : `<div class="setup-add">
              <p class="muted"><strong>Off by default — the DPIA gate.</strong> Pupil credentials are a new category of personal data:
                the DPIA's [CONFIRM] items must be completed and <strong>signed by the DPO and SLT</strong> before any pupil can log in
                (docs/DPIA.md §8).</p>
              <form hx-post="/settings/pupil-access" hx-target="#pupil-access-result" hx-swap="innerHTML"
                    hx-on::after-request="if(event.detail.successful)location.reload()">
                <input type="hidden" name="enable" value="true">
                <label><input type="checkbox" name="ack" value="yes" required> the DPIA has been signed off by the DPO and SLT</label>
                <button type="submit" class="btn-secondary">Enable pupil access</button>
              </form>
              <div id="pupil-access-result"></div>
            </div>`
      }
      <div class="setup-add">
        <label>Pupil idle logout <input class="setup-num" style="width:4rem" value="${esc(pupilIdle ?? '20')}"
          hx-post="/settings/pupil-idle" hx-vals='js:{"value":event.target.value}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"> min
          <span class="muted">(classroom-only use → relaxed default)</span></label>
        <span class="note-status" id="pupil-status"></span>
      </div>

      <h2>Auto-marking</h2>
      <p class="muted">Marks pupils' answers (objective answers instantly; written answers AI-suggested, you confirm),
        shows released results on the pupil's screen, builds "what works for me" profiles, and can remember a pupil's
        device. Per-class settings (mark-as-they-finish vs on a button; show scores or ticks-only; remembered devices)
        live on each lesson's <em>Pupil work</em> panel.</p>
      ${
        marksOn === 'true'
          ? `<p class="adapt-note">✅ Auto-marking is <strong>enabled</strong>${marksAck ? ` (DPIA addendum acknowledged ${esc(marksAck.slice(0, 10))})` : ''}.
              <button type="button" class="link danger" hx-post="/settings/marks-access" hx-vals='{"enable":"false"}' hx-swap="none" hx-on::after-request="location.reload()">Disable</button></p>`
          : `<div class="setup-add">
              <p class="muted"><strong>Off by default — the DPIA addendum gate.</strong> Auto-marking stores per-pupil
                attainment, sends <em>anonymised</em> answer text to the AI for marking, and issues a remembered-device
                credential — each a new data-protection consideration. The DPIA addendum (docs/DPIA.md) must be completed
                and <strong>signed by the DPO and SLT</strong> before enabling. Requires pupil access already on.</p>
              <form hx-post="/settings/marks-access" hx-target="#marks-access-result" hx-swap="innerHTML"
                    hx-on::after-request="if(event.detail.successful)location.reload()">
                <input type="hidden" name="enable" value="true">
                <label><input type="checkbox" name="ack" value="yes" required> the DPIA addendum has been signed off by the DPO and SLT</label>
                <button type="submit" class="btn-secondary">Enable auto-marking</button>
              </form>
              <div id="marks-access-result"></div>
            </div>`
      }

      <h2>Email intake</h2>
      <p class="muted">Emails arriving in this mailbox become inbox tasks automatically (the paste box still works too).
        Use a <strong>dedicated or forwarded mailbox</strong>, not your main school account — set an Outlook rule that
        forwards the mail you want as tasks. Only unread mail is imported; imported mail is marked read.</p>
      <div class="setup-add" id="email-intake-fields">
        <label>IMAP host <input name="email_imap_host" value="${esc(emHost ?? '')}" placeholder="imap.gmail.com"
          hx-post="/settings/email?key=email_imap_host" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
        <label>Port <input class="setup-num" style="width:5rem" name="email_imap_port" value="${esc(emPort ?? '')}" placeholder="993"
          hx-post="/settings/email?key=email_imap_port" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
        <label>User <input name="email_imap_user" value="${esc(emUser ?? '')}" placeholder="organiser.intake@gmail.com" autocomplete="off"
          hx-post="/settings/email?key=email_imap_user" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
        <label>Password <input type="password" name="email_imap_password" value="" placeholder="${emPass ? 'saved — type to replace' : 'app password'}" autocomplete="new-password"
          hx-post="/settings/email?key=email_imap_password" hx-trigger="input changed delay:700ms, change" hx-swap="none">${emPass ? '<span class="muted"> configured ✓</span>' : ''}</label>
        <label>Folder <input name="email_imap_folder" value="${esc(emFolder ?? '')}" placeholder="INBOX"
          hx-post="/settings/email?key=email_imap_folder" hx-trigger="input changed delay:700ms, change" hx-swap="none"></label>
        <span class="note-status" id="email-status"></span>
      </div>
      <div class="setup-add">
        <label><input type="checkbox" name="email_poll_enabled" value="true"${emOn === 'true' ? ' checked' : ''}
          hx-post="/settings/email?key=email_poll_enabled" hx-trigger="change" hx-swap="none"> poll automatically</label>
        <label>every <input class="setup-num" style="width:4rem" name="email_poll_minutes" value="${esc(emMins ?? '5')}"
          hx-post="/settings/email?key=email_poll_minutes" hx-trigger="input changed delay:700ms, change" hx-swap="none"> min</label>
        <label><input type="checkbox" name="email_imap_tls" value="true"${emTls !== 'false' ? ' checked' : ''}
          hx-post="/settings/email?key=email_imap_tls" hx-trigger="change" hx-swap="none"> TLS</label>
        <button type="button" class="btn-secondary" title="saves whatever is typed above first, then polls"
          hx-post="/settings/email/test" hx-include="#email-intake-fields" hx-target="#email-test-result" hx-swap="disabled-elt">Poll now / test</button>
      </div>
      <div id="email-test-result">${emLast ? `<p class="muted">last poll: ${esc(emLast)}</p>` : ''}</div>

      <h2>Data health</h2>
      <ul class="rollover-checks">
        <li>${health.current ? `✅ current year: <strong>${esc(health.current)}</strong>` : '⚠ no current academic year set'} (${health.years} year${health.years === 1 ? '' : 's'} in the database)</li>
        <li>📦 database size: ~${health.dbMb} MB</li>
        <li>🤖 AI calls this month: ${health.aiMonth}</li>
        <li>💾 backups: run <code>scripts/backup.sh</code> on a schedule (encrypted at rest) — disaster recovery in <code>docs/RUNBOOK.md</code></li>
        <li>${backupVerified ? `✅ last restore-drill verified: <strong>${esc(backupVerified)}</strong>` : '⚠ no verified restore yet — run <code>scripts/verify-backup.sh</code> (a backup you can\'t restore isn\'t a backup)'}</li>
        <li>${emOn === 'true' ? `📧 email intake: ${emLast ? esc(emLast) : 'on, not polled yet'}` : '📧 email intake off'}</li>
      </ul>
      <p class="muted">Setup checklist: <a href="/welcome">/welcome</a> · September: <a href="/setup/rollover">rollover wizard</a></p>
      <p class="muted">Testing: <a href="/test-lab">🧪 Test Lab</a> — run any lesson in a sandbox (teacher + test pupil, write answers, mark) with no effect on real classes.</p>
    </section>
  `;
}
