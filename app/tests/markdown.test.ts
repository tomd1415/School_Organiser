import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/lib/markdown';

describe('renderMarkdown (resource preview)', () => {
  it('headings, lists and emphasis', () => {
    const html = renderMarkdown('# Title\n\n## Part\n\nSome **bold** and *italic* and `code`.\n\n- one\n- two\n\n1. first\n2. second');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Part</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect((html.match(/<li>/g) ?? []).length).toBe(4);
  });

  it('tables (worksheets rely on them)', () => {
    const html = renderMarkdown('| Task | Done |\n|---|---|\n| Open the file | yes |\n| Add a SUM | no |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Task</th>');
    expect(html).toContain('<td>Add a SUM</td>');
  });

  it('task checkboxes, blockquotes, fences, hr', () => {
    const html = renderMarkdown('- [ ] todo\n- [x] done\n\n> Say: well done\n\n```\nprint("hi")\n```\n\n---');
    expect(html).toContain('md-task');
    expect(html).toContain('checked');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<pre><code>print(&quot;hi&quot;)</code></pre>');
    expect(html).toContain('<hr>');
  });

  it('raw HTML in the source can never reach the page', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script>\n\n# <b>x</b>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>');
  });

  it('emoji-only lines become large visuals; images render', () => {
    const html = renderMarkdown('## Slide 1\n\n📬\n\nA bullet\n\n![diagram](https://school.local/x.png)');
    expect(html).toContain('class="md-visual">📬');
    expect(html).toContain('<img class="md-img" src="https://school.local/x.png"');
  });

  it('paragraph line-breaks and links', () => {
    const html = renderMarkdown('line one\nline two\n\n[BBC](https://bbc.co.uk/page)');
    expect(html).toContain('line one<br>line two');
    expect(html).toContain('<a href="https://bbc.co.uk/page"');
  });

  it('renders app-hosted (root-relative) and data:image images, not just http(s)', () => {
    // App-hosted worksheet images (e.g. /resources/:id/view) previously fell through and vanished.
    expect(renderMarkdown('![diagram](/resources/12/view)')).toContain('<img class="md-img" src="/resources/12/view"');
    expect(renderMarkdown('![chip](data:image/png;base64,iVBORw0KGgo=)')).toContain('<img class="md-img" src="data:image/png;base64,iVBORw0KGgo=');
  });

  it('refuses unsafe image URLs (protocol-relative, javascript:) — left as text, never an <img src>', () => {
    expect(renderMarkdown('![x](//evil.example/x.png)')).not.toContain('<img');
    expect(renderMarkdown('![x](javascript:alert(1))')).not.toContain('<img');
  });
});
