<script>
  import { onMount } from 'svelte';
  import { blotter } from '../stores/blotter.js';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import TurndownService from 'turndown';
  import { htmlToMd } from '../utils/serializer.js';
  import { applyFormat } from '../utils/commands.js';
  import Toolbar from './Toolbar.svelte';

  let editor;
  let lastMd = '';
  let activeBlock = null;
  let serializeTimer;
  const turndownService = new TurndownService({ headingStyle: 'atx', hr: '---', bulletListMarker: '-' });

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  onMount(() => {
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

    clearTimeout(serializeTimer);
    serializeTimer = setTimeout(() => {
      const md = htmlToMd(editor.innerHTML);
      lastMd = md;
      blotter.set(md);
    }, 300);

    refreshActive();
  }

  // Detect likely markdown: headings, emphasis, lists, links, blockquotes, code, hr
  const MD_RE = /^#{1,6} |\*{1,2}\S|~~\S|\*{2}|^[-*+] |\d+\. |^> |`[^`\n]|!\[|\[.+?\]\(|^---$/m;

  function handlePaste(e) {
    e.preventDefault();

    const htmlData = e.clipboardData?.getData('text/html');
    if (htmlData) {
      const md = turndownService.turndown(htmlData);
      const html = DOMPurify.sanitize(marked.parse(md, { breaks: true }));
      insertFragment(html);
      handleInput();
      return;
    }

    const text = (e.clipboardData || window.clipboardData).getData('text/plain');

    if (MD_RE.test(text)) {
      const html = DOMPurify.sanitize(marked.parse(text, { breaks: true }));
      insertFragment(html);
    } else {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    handleInput();
  }

  // Re-render on blur so bare URLs typed by the user become clickable links
  function handleBlur() {
    if (!editor) return;
    activeBlock = null;
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
      insertNewParagraph();
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

  // Re-render a single block after the cursor has left it.
  // Only applies to plain paragraph/div blocks — headings, list items, and
  // blockquotes are already rendered and must not be re-processed here.
  function renderBlock(block) {
    if (!block || !editor.contains(block)) return;
    const tag = block.tagName?.toUpperCase();
    if (tag !== 'P' && tag !== 'DIV') return;

    const md = htmlToMd(block.outerHTML).trim();
    if (!md) return;

    const rendered = DOMPurify.sanitize(marked.parse(md, { breaks: true })).trim();
    if (!rendered) return;

    const tmp = document.createElement('div');
    tmp.innerHTML = rendered;
    if (block.outerHTML === tmp.innerHTML) return;

    const frag = document.createDocumentFragment();
    while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    block.replaceWith(frag);

    const newMd = htmlToMd(editor.innerHTML);
    if (newMd !== lastMd) {
      lastMd = newMd;
      blotter.set(newMd);
    }
  }

  function refreshActive() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { active = {}; return; }

    const range = sel.getRangeAt(0);
    const node  = range.startContainer;
    const el    = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (!editor || !editor.contains(el)) return;

    // Detect block change and re-render the block the cursor just left
    const currentBlock = findBlock(node);
    if (currentBlock !== activeBlock) {
      const prev = activeBlock;
      activeBlock = currentBlock;
      renderBlock(prev);
    }

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

  // ── Insert / inline / block helpers ────────────────────────────────────────

  // Replace the current selection with parsed HTML nodes.
  function insertFragment(html) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let last = null;
    while (tmp.firstChild) { last = tmp.firstChild; frag.appendChild(last); }
    range.insertNode(frag);
    if (last) {
      const r = document.createRange();
      r.selectNodeContents(last);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  // Split the current block at the cursor, inserting a new <p> after.
  function insertNewParagraph() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    const block = findBlock(range.startContainer);
    if (!block) return;

    const tailRange = document.createRange();
    tailRange.setStart(range.startContainer, range.startOffset);
    tailRange.setEnd(block, block.childNodes.length);
    const extracted = tailRange.extractContents();

    const newP = document.createElement('p');
    const hasContent = extracted.textContent.trim() || extracted.querySelector('img,br');
    if (hasContent) {
      newP.appendChild(extracted);
    } else {
      newP.innerHTML = '<br>';
    }

    if (!block.hasChildNodes() || !block.textContent.trim()) {
      block.innerHTML = '<br>';
    }

    block.after(newP);

    const r = document.createRange();
    r.setStart(newP, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function handleFormat(fmt) {
    applyFormat(fmt, editor, active, handleInput);
  }
</script>

<Toolbar {active} onFormat={handleFormat} />

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
