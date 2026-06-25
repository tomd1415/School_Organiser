import { describe, expect, it } from 'vitest';
import { renderMapPage, slotKey, slotLabel } from '../src/lib/mapView';
import { GALLERY_MAP } from '../src/lib/uiFixtures';

// Curriculum map (SPEC §8): the term-calendar timeline rail. Pure data→HTML, DB-free.

describe('map slot helpers', () => {
  it('slotKey is lessonId:groupCourseId; slotLabel reads group · course · day period', () => {
    expect(slotKey(GALLERY_MAP.chosen)).toBe('4:9');
    expect(slotLabel(GALLERY_MAP.chosen)).toContain('9X');
    expect(slotLabel(GALLERY_MAP.chosen)).toContain('Computing');
    expect(slotLabel(GALLERY_MAP.chosen)).toContain('P3');
  });
});

describe('renderMapPage — timeline rail', () => {
  const html = renderMapPage(GALLERY_MAP);

  it('renders the timeline carrying the drag hooks (slot + csrf)', () => {
    expect(html).toContain('class="map-timeline"');
    expect(html).toContain('data-map-slot="4:9"');
    expect(html).toContain('data-map-csrf="gallery"');
  });

  it('past rows are green-tone with their stopping point; an adapted one is marked', () => {
    expect(html).toContain('map-row map-past');
    expect(html).toContain('stopped at slide 8');
    expect(html).toContain('map-adapted');
  });

  it('today is its own toned row marked "today"', () => {
    expect(html).toContain('map-row map-today');
    expect(html).toContain('>today<');
  });

  it('a future week with no lesson is an empty dashed row', () => {
    expect(html).toContain('map-empty');
    expect(html).toContain('— nothing planned');
  });

  it('future lessons are draggable; carry-over offered on recent taught rows', () => {
    expect(html).toContain('draggable="true"');
    expect(html).toContain('continue next week');
  });

  it('links to the lesson and the master scheme via paths (no raw literals)', () => {
    expect(html).toContain('/lesson?lesson=4&amp;date=2026-06-09');
    expect(html).toContain('/schemes?course=2');
  });
});
