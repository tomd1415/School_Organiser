import { describe, expect, it } from 'vitest';
import { renderResourceItem, renderResourceListPaged, renderSearchBar } from '../src/lib/resourceView';
import { GALLERY_RESOURCES } from '../src/lib/uiFixtures';

// Resources (SPEC §10): kind-badged card grid + search/filter pills. Pure data→HTML, DB-free.

describe('renderResourceItem — §10 card', () => {
  const slides = GALLERY_RESOURCES.rows[0]!; // slides, v3, 2 used
  const html = renderResourceItem(slides);

  it('is a card with a kind badge, mono version and title', () => {
    expect(html).toContain('class="card res-card"');
    expect(html).toContain('class="badge live">Slides'); // slides → teal
    expect(html).toContain('v3');
    expect(html).toContain('Networks — slides deck');
  });

  it('shows the linked-lesson count, size and Open/Present/download', () => {
    expect(html).toContain('🔗 2');
    expect(html).toContain('KB');
    expect(html).toContain('/resources/1/view'); // Open
    expect(html).toContain('/resources/1/present'); // Present ↗ (slides only)
    expect(html).toContain('/resources/1/download');
  });

  it('non-slides get no Present link', () => {
    const quiz = renderResourceItem(GALLERY_RESOURCES.rows[2]!); // quiz
    expect(quiz).toContain('class="badge warn">Quiz'); // quiz → amber
    expect(quiz).not.toContain('/present');
  });
});

describe('renderSearchBar — §10 filter pills', () => {
  const html = renderSearchBar(['slides', 'worksheet', 'quiz'], 'binary', 'worksheet');

  it('renders an All pill plus one radio pill per kind, the active one checked', () => {
    expect(html).toContain('class="res-pills"');
    expect(html).toContain('>All<');
    expect(html).toContain('value="worksheet" checked');
    expect(html).toContain('res-pill is-on'); // active kind highlighted
    expect(html).toContain('value="binary"'); // preserves the current query
  });
});

describe('renderResourceListPaged — §10 grid', () => {
  it('renders the cards in a grid container', () => {
    const html = renderResourceListPaged(GALLERY_RESOURCES);
    expect(html).toContain('class="res-grid"');
    expect(html).toContain('3 resources');
  });
});
