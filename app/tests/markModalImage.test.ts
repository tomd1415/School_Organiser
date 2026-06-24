import { describe, it, expect } from 'vitest';
import { renderMarkModal } from '../src/lib/markModalView';
import { renderWorksheet, type Level } from '../src/lib/worksheetForm';
import type { PupilWorkRow } from '../src/repos/pupilWork';

// Regression (reported 2026-06-24): a pupil's pasted screenshot answer (kind 'image') was filtered out of
// the marking modal entirely — "not even a place for them to be". The modal must now show the screenshot
// (served via /pupil-image) with a mark control. See markModalView.ts questions filter + the image branch.

const WS_MD = [
  '| Question | Answer |',
  '| --- | --- |',
  '| Show your finished program | Paste a screenshot of your work here |',
].join('\n');

const KEY_PREFIX = 'w0:';
const imageField = renderWorksheet(WS_MD, { mode: 'review', keyPrefix: KEY_PREFIX }).fields.find((f) => f.kind === 'image');

const roster: PupilWorkRow[] = [
  { pupilId: 5, displayName: 'Test Pupil', level: 'core' as Level, filled: 1, lastSaved: '2026-06-24 10:00', done: false, unseen: 1, rating: null },
];

function render(value: string | null) {
  return renderMarkModal({
    oc: 20,
    pid: 5,
    marking: true,
    wsIndex: 0,
    header: null,
    worksheets: [{ markdown: WS_MD, keyPrefix: KEY_PREFIX, title: 'Test — worksheet.md' }],
    roster,
    level: 'core',
    atlScore: null,
    ansRows: value == null ? [] : [{ id: 1, field_key: imageField!.key, value }],
    marks: [],
    comment: '',
    scheme: null,
  });
}

describe('marking modal — pupil screenshot answers', () => {
  it('the worksheet fixture yields a screenshot (image) field', () => {
    expect(imageField, 'screenshot cell should parse to a kind:image field').toBeTruthy();
  });

  it('renders the pasted screenshot as an <img> served from /pupil-image, with a mark control', () => {
    const html = render('img:2026/06/pupil5.png');
    expect(html).toContain('class="mm-shot"');
    expect(html).toContain('/pupil-image?p=2026%2F06%2Fpupil5.png'); // resolved via paths.pupilImage
    expect(html).toContain('screenshot'); // the kind tag
    // it is markable: the tick/score control is present (not "nothing to mark")
    expect(html).toMatch(/mm-tick|mm-num/);
    expect(html).not.toContain('img:2026'); // never leak the raw stored value
  });

  it('shows a placeholder (not a broken image) when no screenshot was pasted yet', () => {
    const html = render(null);
    expect(html).toContain('no screenshot yet');
    expect(html).not.toContain('class="mm-shot"');
  });
});
