import { describe, it, expect } from 'vitest';
import {
  renderFollowup,
  renderNewNoteButton,
  renderNoteItem,
  renderNotesList,
  renderSavedStatus,
} from '../src/lib/notesView';

describe('notesView', () => {
  it('renders a note item with autosave wiring and escapes the body', () => {
    const html = renderNoteItem({ id: 7, body: '<script>x</script>', time: '11:48', followups: [] });
    expect(html).toContain('id="note-7"');
    expect(html).toContain('hx-post="/notes/7"');
    expect(html).toContain('hx-trigger="input changed delay:800ms, blur"');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>x');
  });

  it('reflects follow-up done state', () => {
    expect(renderFollowup({ id: 3, text: 'do', done: true })).toContain('checked');
    expect(renderFollowup({ id: 4, text: 'do', done: false })).not.toContain('checked');
  });

  it('new-note button carries hx-vals and the list target', () => {
    const html = renderNewNoteButton('notes-list-9', { kind: 'lesson', occurrence: 9 });
    expect(html).toContain('data-new-note');
    expect(html).toContain('"occurrence":9');
    expect(html).toContain('hx-target="#notes-list-9"');
  });

  it('saved status is an out-of-band swap', () => {
    expect(renderSavedStatus('note-7-status')).toContain('hx-swap-oob="true"');
  });

  it('notes list carries the list id', () => {
    const html = renderNotesList('notes-list-1', [{ id: 1, body: 'x', time: 't', followups: [] }]);
    expect(html).toContain('id="notes-list-1"');
    expect(html).toContain('id="note-1"');
  });
});
