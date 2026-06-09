import { describe, it, expect } from 'vitest';
import { exactlyOneTarget, kindFromFilename, mimeFromFilename, previewKind, safeFilename } from '../src/services/resource';

describe('resource service', () => {
  it('classifies kind from the extension', () => {
    expect(kindFromFilename('lesson.pptx')).toBe('slides');
    expect(kindFromFilename('rubric.docx')).toBe('document');
    expect(kindFromFilename('marks.xlsx')).toBe('worksheet');
    expect(kindFromFilename('diagram.png')).toBe('image');
    expect(kindFromFilename('guide.pdf')).toBe('document');
  });

  it('chooses a preview mode', () => {
    expect(previewKind('application/pdf', 'a.pdf')).toBe('pdf');
    expect(previewKind('image/png', 'a.png')).toBe('image');
    expect(previewKind(null, 'deck.pptx')).toBe('office');
    expect(previewKind(null, 'clip.mp4')).toBe('other');
  });

  it('enforces exactly one link target', () => {
    expect(exactlyOneTarget({ lessonPlanId: 5 })).toBe(true);
    expect(exactlyOneTarget({})).toBe(false);
    expect(exactlyOneTarget({ courseId: 1, lessonPlanId: 5 })).toBe(false);
  });

  it('makes a filesystem-safe name', () => {
    expect(safeFilename('/a/b/My Deck (v2).pptx')).toBe('My Deck _v2_.pptx');
    expect(safeFilename('')).toBe('file');
  });

  it('maps mime from the extension', () => {
    expect(mimeFromFilename('a.pdf')).toBe('application/pdf');
    expect(mimeFromFilename('a.unknownext')).toBe('application/octet-stream');
  });
});
