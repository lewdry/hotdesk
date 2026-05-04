<script>
  import { onMount } from 'svelte';
  import { blotter } from '../stores/blotter.js';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  let editor;
  let lastMd = '';

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  onMount(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
    const html = DOMPurify.sanitize(marked.parse($blotter || '', { breaks: true }));
    editor.innerHTML = html || '<p><br></p>';
    lastMd = $blotter;
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  });

  // Re-render when store changes from outside (import / reset)
  $: if (editor && $blotter !== lastMd) {
    const html = DOMPurify.sanitize(marked.parse($blotter || '', { breaks: true }));
    editor.innerHTML = html || '<p><br></p>';
    lastMd = $blotter;
  }

  // ── HTML → Markdown serializer ──────────────────────────────────────────────
  function htmlToMd(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    return walk(root).replace(/\n{3,}/g, '\n\n').trim();
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.replace(/\u00a0/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag  = node.tagName.toLowerCase();
    const kids = () => Array.from(node.childNodes).map(walk).join('');

    switch (tag) {
      case 'body':
      case 'div':
        return Array.from(node.childNodes).map(n => {
          if (n.nodeType === Node.TEXT_NODE) {
            const t = n.textContent.replace(/\u00a0/g, ' ').trim();
            return t ? t + '\n\n' : '';
          }
          return walk(n);
        }).join('');
      case 'p': {
        const c = kids().trim();
        return c ? c + '\n\n' : '\n';
      }
      case 'h1': return `# ${kids().trim()}\n\n`;
      case 'h2': return `## ${kids().trim()}\n\n`;
      case 'h3': return `### ${kids().trim()}\n\n`;
      case 'h4': return `#### ${kids().trim()}\n\n`;
      case 'h5': return `##### ${kids().trim()}\n\n`;
      case 'h6': return `###### ${kids().trim()}\n\n`;
      case 'strong':
      case 'b': { const c = kids(); return c.trim() ? `**${c}**` : ''; }
      case 'em':
      case 'i': { const c = kids(); return c.trim() ? `*${c}*` : ''; }
      case 'u': { return kids(); }
      case 'del':
      case 's':
      case 'strike': { const c = kids(); return c.trim() ? `~~${c}~~` : ''; }
      case 'hr': return '---\n\n';
      case 'br': return '\n';
      case 'a': return `[${kids()}](${node.getAttribute('href') || ''})`;
      case 'code': return node.closest('pre') ? kids() : `\`${kids()}\``;
      case 'pre': return `\`\`\`\n${kids().trim()}\n\`\`\`\n\n`;
      case 'ul': {
        const lis = [...node.children].filter(n => n.tagName === 'LI');
        return lis.length
          ? lis.map(li => {
              // Task list item: contains a checkbox input
              const cb = li.querySelector('input[type="checkbox"]');
              if (cb) {
                const checked = cb.checked ? 'x' : ' ';
                // Text content without the checkbox
                const text = [...li.childNodes]
                  .filter(n => !(n.nodeType === Node.ELEMENT_NODE && n.tagName === 'INPUT'))
                  .map(walk).join('').trim();
                return `- [${checked}] ${text}`;
              }
              return `- ${[...li.childNodes].map(walk).join('').trim()}`;
            }).join('\n') + '\n\n'
          : kids();
      }
      case 'ol': {
        const lis = [...node.children].filter(n => n.tagName === 'LI');
        return lis.length
          ? lis.map((li, i) => `${i + 1}. ${[...li.childNodes].map(walk).join('').trim()}`).join('\n') + '\n\n'
          : kids();
      }
      case 'li': return kids();
      case 'input': {
        // Handled inside ul case; skip here to avoid duplicate text
        return '';
      }
      case 'img': {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        return `![${alt}](${src})`;
      }
      case 'table': {
        const rows = [...node.querySelectorAll('tr')];
        if (!rows.length) return kids();
        const toText = cell => walk(cell).trim().replace(/\|/g, '\\|');
        const headerRow = rows[0];
        const headers = [...headerRow.querySelectorAll('th, td')].map(toText);
        const separator = headers.map(() => '---');
        const bodyRows = rows.slice(1).map(row =>
          [...row.querySelectorAll('th, td')].map(toText)
        );
        const fmt = cols => '| ' + cols.join(' | ') + ' |';
        return [fmt(headers), fmt(separator), ...bodyRows.map(fmt)].join('\n') + '\n\n';
      }
      case 'thead':
      case 'tbody':
      case 'tfoot':
      case 'tr':
      case 'th':
      case 'td': return kids();
      case 'blockquote': {
        const c = kids().trim();
        return c ? c.split('\n').map(l => `> ${l}`).join('\n') + '\n\n' : '';
      }
      case 'span': {
        let c = kids();
        const s = node.getAttribute('style') || '';
        if (/font-weight\s*:\s*(bold|700)/i.test(s))          c = `**${c}**`;
        if (/font-style\s*:\s*italic/i.test(s))               c = `*${c}*`;
        if (/text-decoration[^;]*line-through/i.test(s))      c = `~~${c}~~`;
        return c;
      }
      default: return kids();
    }
  }

  function normalizeEditorText(text) {
    return text
      .replace(/\u00a0/g, ' ')
      .replace(/\u200b/g, '')
      .trim();
  }

  function insertHorizontalRule(target, selection) {
    const hr = document.createElement('hr');
    const p = document.createElement('p');
    p.innerHTML = '<br>';

    if (target === editor) {
      editor.replaceChildren(hr, p);
    } else {
      target.after(hr, p);
      target.remove();
    }

    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function findRuleMarkerTarget(selection) {
    if (!selection?.rangeCount || !editor) return null;

    const block = findBlock(selection.getRangeAt(0).startContainer);
    if (block && normalizeEditorText(block.textContent) === '--') {
      return block;
    }

    if (normalizeEditorText(editor.textContent || '') !== '--') {
      return null;
    }

    const onlyTextAtRoot = Array.from(editor.childNodes).every(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeEditorText(node.textContent || '') === '--' || normalizeEditorText(node.textContent || '') === '';
      }

      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
        return true;
      }

      return false;
    });

    return onlyTextAtRoot ? editor : null;
  }

  // ── Input handler ───────────────────────────────────────────────────────────
  function handleInput() {
    if (!editor) return;

    // Auto-convert: a block containing only "--" → <hr>
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const ruleTarget = findRuleMarkerTarget(sel);
      if (ruleTarget) {
        insertHorizontalRule(ruleTarget, sel);
      }
    }

    const md = htmlToMd(editor.innerHTML);
    lastMd = md;
    blotter.set(md);
    refreshActive();
  }

  // Paste as plain text to avoid injecting foreign HTML
  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  // Re-render on blur so bare URLs typed by the user become clickable links
  function handleBlur() {
    if (!editor) return;
    const md = htmlToMd(editor.innerHTML);
    const html = DOMPurify.sanitize(marked.parse(md || '', { breaks: true }));
    const newHtml = html || '<p><br></p>';
    // Only replace DOM if content actually changed — avoids destroying the selection
    // for a no-op blur (e.g. clicking a menu item), which would leave a ghost caret
    // at the raw top-left corner of the editor element.
    if (editor.innerHTML !== newHtml) {
      editor.innerHTML = newHtml;
    }
    // Either way, clear any lingering selection now that the element is blurred.
    // Without this the browser renders a ghost caret at offset 0 (before padding).
    window.getSelection()?.removeAllRanges();
    lastMd = md;
    blotter.set(md);
  }

  // Convert a bare URL immediately before the cursor into an <a> tag
  const URL_RE = /(?:https?:\/\/|www\.)\S+$/;

  function handleKeydown(e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;

    // Escape blockquote on Enter from a blank line (mirrors h1/list behaviour)
    if (e.key === 'Enter' && inBlockquote()) {
      const sel0 = window.getSelection();
      if (sel0?.rangeCount) {
        const blk = findBlock(sel0.getRangeAt(0).startContainer);
        if (blk && blk.textContent.trim() === '') {
          e.preventDefault();
          const bq = blk.closest('blockquote');
          blk.remove();
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          if (bq.children.length === 0) {
            bq.replaceWith(p);
          } else {
            bq.after(p);
          }
          const r = document.createRange();
          r.setStart(p, 0);
          r.collapse(true);
          sel0.removeAllRanges();
          sel0.addRange(r);
          handleInput();
          return;
        }
      }
    }

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const textBefore = node.textContent.slice(0, range.startOffset);
    const match = textBefore.match(URL_RE);
    if (!match) return;

    const url = match[0];
    const start = range.startOffset - url.length;

    e.preventDefault();

    const before = node.textContent.slice(0, start);
    const after  = node.textContent.slice(range.startOffset);

    const href   = url.startsWith('www.') ? 'http://' + url : url;
    const anchor = document.createElement('a');
    anchor.href        = href;
    anchor.textContent = url;

    const beforeNode = document.createTextNode(before);
    const afterNode  = document.createTextNode(after);
    const parent     = node.parentNode;

    parent.insertBefore(beforeNode, node);
    parent.insertBefore(anchor, node);
    node.replaceWith(afterNode);

    // Position cursor and handle Space vs Enter
    const r = document.createRange();
    if (e.key === ' ') {
      const space = document.createTextNode('\u00a0');
      afterNode.before(space);
      r.setStartAfter(space);
    } else {
      r.setStartAfter(anchor);
    }
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);

    if (e.key === 'Enter') {
      document.execCommand('insertParagraph', false);
    }

    handleInput();
  }

  // Intercept mousedown in the padding area (e.target === editor means no content child
  // was hit). Prevent the browser from ever placing the caret at the raw element origin
  // (top-left corner before padding), then manually position it at the nearest content end.
  function handleMousedown(e) {
    if (e.target !== editor || e.button !== 0) return;
    e.preventDefault();
    editor.focus({ preventScroll: true });

    const sel = window.getSelection();
    const r   = document.createRange();
    const rect = editor.getBoundingClientRect();

    if (e.clientY < rect.top + rect.height / 2) {
      // Top half → go to start of first content node
      const first = editor.firstElementChild || editor.firstChild;
      if (first) { r.setStart(first, 0); r.collapse(true); }
    } else {
      // Bottom half → go to end of last content node
      const last = editor.lastElementChild || editor.lastChild;
      if (last) { r.selectNodeContents(last); r.collapse(false); }
    }

    sel.removeAllRanges();
    sel.addRange(r);
  }

  // Open links in a new tab — clicking <a> inside contenteditable doesn't navigate
  function handleClick(e) {
    const link = e.target.closest('a[href]');
    if (link) {
      e.preventDefault();
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  }

  // ── Active format state ─────────────────────────────────────────────────────
  let active = {};

  function refreshActive() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { active = {}; return; }

    const range = sel.getRangeAt(0);
    const node  = range.startContainer;
    const el    = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (!editor || !editor.contains(el)) return;

    function hasTag(element, ...tags) {
      let n = element;
      while (n && n !== editor) {
        if (tags.includes(n.tagName?.toLowerCase())) return true;
        n = n.parentElement;
      }
      return false;
    }

    function nearestBlockTag(element) {
      let n = element;
      while (n && n !== editor) {
        const t = n.tagName?.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'p', 'li', 'div'].includes(t)) return t;
        n = n.parentElement;
      }
      return '';
    }

    const blockTag = nearestBlockTag(el);
    active = {
      bold:          hasTag(el, 'strong', 'b'),
      italic:        hasTag(el, 'em', 'i'),
      strikethrough: hasTag(el, 'del', 's', 'strike'),
      body:          blockTag === 'p' || blockTag === 'div',
      h1:            blockTag === 'h1',
      h2:            blockTag === 'h2',
      bullet:        hasTag(el, 'ul'),
      ordered:       hasTag(el, 'ol'),
      quote:         inBlockquote(),
    };
  }

  function inBlockquote() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return false;
    const n  = sel.getRangeAt(0).startContainer;
    const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
    return !!el?.closest?.('blockquote');
  }

  // ── Block helpers ───────────────────────────────────────────────────────────
  const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'DIV']);

  function findBlock(node) {
    let n = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (n && n !== editor) {
      if (BLOCKS.has(n.tagName)) return n;
      n = n.parentElement;
    }
    return null;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function applyMultilineList(tagName) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return false;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return false;

    const text = range.toString().replace(/\u00a0/g, ' ');
    if (!/[\r\n]/.test(text)) return false;

    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (!lines.length) return false;

    const html = `<${tagName}>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</${tagName}>`;
    document.execCommand('insertHTML', false, html);
    return true;
  }

  // ── Formatting ──────────────────────────────────────────────────────────────
  function applyFormat(fmt) {
    if (!editor) return;
    editor.focus();

    switch (fmt) {
      case 'bold':          document.execCommand('bold',                false); break;
      case 'italic':        document.execCommand('italic',              false); break;
      case 'strikethrough': document.execCommand('strikeThrough',       false); break;
      case 'bullet':
        if (!applyMultilineList('ul')) {
          document.execCommand('insertUnorderedList', false);
        }
        break;
      case 'ordered':
        if (!applyMultilineList('ol')) {
          document.execCommand('insertOrderedList', false);
        }
        break;
      case 'body':          document.execCommand('formatBlock',         false, 'p'); break;
      case 'h1': {
        const cur = document.queryCommandValue('formatBlock').toLowerCase();
        document.execCommand('formatBlock', false, cur === 'h1' ? 'p' : 'h1');
        break;
      }
      case 'h2': {
        const cur = document.queryCommandValue('formatBlock').toLowerCase();
        document.execCommand('formatBlock', false, cur === 'h2' ? 'p' : 'h2');
        break;
      }
      case 'quote': toggleBlockquote(); break;
    }

    handleInput();
  }

  function toggleBlockquote() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    if (inBlockquote()) {
      const n  = sel.getRangeAt(0).startContainer;
      const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
      const bq = el.closest('blockquote');
      if (!bq) return;
      const frag = document.createDocumentFragment();
      while (bq.firstChild) frag.appendChild(bq.firstChild);
      bq.replaceWith(frag);
    } else {
      const blk = findBlock(sel.getRangeAt(0).startContainer);
      if (!blk) return;
      const bq = document.createElement('blockquote');
      blk.replaceWith(bq);
      bq.appendChild(blk);
    }
  }
</script>

<!-- Formatting toolbar -->
<div class="fmt-toolbar">
  <button
    class="fmt-btn fmt-bold"
    class:active={active.bold}
    on:mousedown|preventDefault={() => applyFormat('bold')}
    title="Bold"
  ><strong>B</strong></button>

  <button
    class="fmt-btn fmt-italic"
    class:active={active.italic}
    on:mousedown|preventDefault={() => applyFormat('italic')}
    title="Italic"
  ><em>I</em></button>

  <button
    class="fmt-btn fmt-strike"
    class:active={active.strikethrough}
    on:mousedown|preventDefault={() => applyFormat('strikethrough')}
    title="Strikethrough"
  ><s>S</s></button>

  <div class="fmt-sep"></div>

  <button
    class="fmt-btn"
    class:active={active.h1}
    on:mousedown|preventDefault={() => applyFormat('h1')}
    title="Heading 1"
  >H1</button>

  <button
    class="fmt-btn"
    class:active={active.h2}
    on:mousedown|preventDefault={() => applyFormat('h2')}
    title="Heading 2"
  >H2</button>

  <button
    class="fmt-btn"
    class:active={active.body}
    on:mousedown|preventDefault={() => applyFormat('body')}
    title="Body text"
  >¶</button>

  <div class="fmt-sep"></div>

  <button
    class="fmt-btn"
    class:active={active.bullet}
    on:mousedown|preventDefault={() => applyFormat('bullet')}
    title="Bullet list"
  >•</button>

  <button
    class="fmt-btn fmt-ordered"
    class:active={active.ordered}
    on:mousedown|preventDefault={() => applyFormat('ordered')}
    title="Numbered list"
  >1.</button>

  <button
    class="fmt-btn"
    class:active={active.quote}
    on:mousedown|preventDefault={() => applyFormat('quote')}
    title="Blockquote"
  >"</button>

</div>

<!-- WYSIWYG editor -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={editor}
  class="blotter-area"
  contenteditable="true"
  spellcheck="true"
  on:input={handleInput}
  on:paste={handlePaste}
  on:blur={handleBlur}
  on:mousedown={handleMousedown}
  on:click={handleClick}
  on:keydown={handleKeydown}
  on:keyup={refreshActive}
  on:mouseup={refreshActive}
  on:focus={refreshActive}
></div>

<style>
  /* ── Toolbar ─────────────────────────────────────────────────────────────── */
  .fmt-toolbar {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 3px 6px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-toolbar);
    flex-shrink: 0;
    user-select: none;
  }

  .fmt-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 22px;
    padding: 0 4px;
    font-size: 13px;
    font-family: Chicago, Geneva, 'Helvetica Neue', sans-serif;
    background: var(--color-toolbar);
    border: 1px solid transparent;
    color: var(--color-text);
    cursor: default;
    user-select: none;
    box-sizing: border-box;
  }

  .fmt-btn:hover {
    border-color: var(--color-border);
    box-shadow:
      inset -1px -1px 0 var(--color-shadow-lo),
      inset  1px  1px 0 var(--color-shadow-hi);
  }

  .fmt-btn.active {
    border-color: var(--color-border);
    box-shadow:
      inset  1px  1px 0 var(--color-shadow-lo),
      inset -1px -1px 0 var(--color-shadow-hi);
    background: var(--color-toolbar-pressed);
  }

  .fmt-bold strong   { font-weight: bold;           font-size: 13px; }
  .fmt-italic em     { font-style: italic;           font-size: 13px; font-family: Chicago, Geneva, 'Helvetica Neue', sans-serif; }
  .fmt-underline u   { text-decoration: underline; }
  .fmt-strike s      { text-decoration: line-through; }
  .fmt-ordered       { font-size: 12px; letter-spacing: -0.5px; }

  .fmt-sep {
    width: 1px;
    height: 16px;
    background: var(--color-border);
    margin: 0 3px;
    flex-shrink: 0;
  }

  /* ── Editor ──────────────────────────────────────────────────────────────── */
  .blotter-area {
    flex: 1;
    padding: 1rem 1.25rem;
    overflow-y: auto;
    font-family: 'Sora', Geneva, 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-text);
    background: var(--color-surface);
    word-wrap: break-word;
    outline: none;
  }

  @media (max-width: 480px) {
    .blotter-area {
      padding: 0.5rem 0.5rem;
      font-size: 16px; /* prevent iOS Safari auto-zoom on focus */
    }
  }

  .blotter-area :global(h1),
  .blotter-area :global(h2),
  .blotter-area :global(h3),
  .blotter-area :global(h4) {
    margin: 0.75em 0 0.25em;
    font-family: 'Sora', Geneva, 'Helvetica Neue', sans-serif;
    font-weight: bold;
    line-height: 1.2;
  }

  .blotter-area :global(h1) { font-size: 1.35em; }
  .blotter-area :global(h2) { font-size: 1.15em; }
  .blotter-area :global(h3) { font-size: 1.0em; }

  .blotter-area :global(p)  { margin: 0.4em 0; }

  .blotter-area :global(ul),
  .blotter-area :global(ol) { margin: 0.5em 0; padding-left: 1.5em; }

  .blotter-area :global(li) { margin: 0.2em 0; }

  .blotter-area :global(blockquote) {
    border-left: 3px solid var(--color-border);
    margin: 0.5em 0;
    padding-left: 0.75em;
    color: var(--color-text-muted);
  }

  .blotter-area :global(hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 1em 0;
  }

  .blotter-area :global(a)    { color: var(--color-text-link); }
  .blotter-area :global(strong),
  .blotter-area :global(b)    { font-weight: bold; }
  .blotter-area :global(em),
  .blotter-area :global(i)    { font-style: italic; }
  .blotter-area :global(u)    { text-decoration: underline; }
  .blotter-area :global(s),
  .blotter-area :global(del)  { text-decoration: line-through; }

  .blotter-area > :global(:first-child) {
    margin-top: 0;
  }

  .blotter-area > :global(:last-child) {
    margin-bottom: 0;
  }

  .blotter-area :global(code) {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9em;
    background: var(--color-code-bg);
    padding: 0 3px;
    border: 1px solid var(--color-border-code);
  }

  .blotter-area :global(pre) {
    background: var(--color-code-bg);
    border: 1px solid var(--color-border-code);
    padding: 0.6em 0.8em;
    overflow-x: auto;
    margin: 0.5em 0;
  }
</style>
