// Phase 10.26 — import a roster from an MIS export (SIMS/Arbor etc.). The single biggest setup
// friction, especially at September. Tolerant of column order/names; idempotent (re-importing a
// corrected file doesn't duplicate); LAN-only, no AI. Pupil names → stable ai_tokens via createPupil.
import { parseCsv } from '../lib/csv';
import { createPupil, listPupils } from '../repos/pupils';
import { getCurrentYearId, createGroup, listGroups, enrolPupil } from '../repos/setup';

export interface ImportResult {
  ok: boolean;
  message: string;
  pupilsCreated: number;
  pupilsMatched: number;
  groupsCreated: number;
  enrolments: number;
  skipped: number;
  rowsSeen: number;
}

const find = (header: string[], re: RegExp): number => header.findIndex((h) => re.test(h.trim()));

export async function importRoster(text: string): Promise<ImportResult> {
  const empty: ImportResult = { ok: false, message: '', pupilsCreated: 0, pupilsMatched: 0, groupsCreated: 0, enrolments: 0, skipped: 0, rowsSeen: 0 };
  const rows = parseCsv(text);
  if (rows.length < 2) return { ...empty, message: 'Paste a CSV with a header row and at least one pupil row.' };
  if (rows.length > 2001) return { ...empty, message: 'That looks too large — import up to 2000 rows at a time.' };

  const header = rows[0]!;
  const nameIdx = find(header, /^(name|pupil|pupil ?name|full ?name|student)$/i);
  const foreIdx = find(header, /(fore|first|given) ?name|^forename$|^first$/i);
  const surIdx = find(header, /(sur|last|family) ?name|^surname$|^last$/i);
  const groupIdx = find(header, /class|group|reg(istration)?|set|teaching ?group|form/i);

  const hasName = nameIdx >= 0 || (foreIdx >= 0 && surIdx >= 0);
  if (!hasName || groupIdx < 0) {
    return { ...empty, message: 'Could not find the columns. Need a name column (or Forename + Surname) and a class/group column. Got: ' + header.map((h) => h.trim()).filter(Boolean).join(', ') };
  }

  const yearId = await getCurrentYearId();
  if (yearId == null) return { ...empty, message: 'No current academic year — set one in Setup first.' };

  // Load existing pupils + groups once into case-insensitive name maps; grow them as we create.
  const pupilByName = new Map((await listPupils()).map((p) => [p.displayName.trim().toLowerCase(), p.id]));
  const groupByName = new Map((await listGroups(yearId, true)).map((g) => [g.name.trim().toLowerCase(), g.id]));
  const existingGroups = new Set(groupByName.keys());

  const res: ImportResult = { ...empty, ok: true };
  for (const r of rows.slice(1)) {
    res.rowsSeen++;
    const pupilName = (nameIdx >= 0 ? r[nameIdx] ?? '' : `${r[foreIdx] ?? ''} ${r[surIdx] ?? ''}`).trim().replace(/\s+/g, ' ');
    const groupName = (r[groupIdx] ?? '').trim();
    if (!pupilName || !groupName) { res.skipped++; continue; }

    const gKey = groupName.toLowerCase();
    let groupId = groupByName.get(gKey);
    if (groupId == null) {
      groupId = await createGroup(yearId, groupName, null, null);
      groupByName.set(gKey, groupId);
      if (!existingGroups.has(gKey)) res.groupsCreated++;
    }

    const pKey = pupilName.toLowerCase();
    let pupilId = pupilByName.get(pKey);
    if (pupilId == null) {
      pupilId = (await createPupil(pupilName)).id;
      pupilByName.set(pKey, pupilId);
      res.pupilsCreated++;
    } else {
      res.pupilsMatched++;
    }

    await enrolPupil(pupilId, groupId);
    res.enrolments++;
  }

  res.message = `Imported ${res.rowsSeen} row(s): ${res.pupilsCreated} new pupil(s), ${res.pupilsMatched} matched, ${res.groupsCreated} class(es) created, ${res.enrolments} enrolment(s)${res.skipped ? `, ${res.skipped} skipped` : ''}.`;
  return res;
}
