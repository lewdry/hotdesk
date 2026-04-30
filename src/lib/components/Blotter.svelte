<script>
  import { blotter } from '../stores/blotter.js';
  import { previewMode } from '../stores/previewMode.js';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  let textarea;

  $: renderedHTML = $previewMode
    ? DOMPurify.sanitize(marked.parse($blotter))
    : '';

  function handleInput(e) {
    blotter.set(e.target.value);
    typewriterScroll();
  }

  function typewriterScroll() {
    if (!textarea) return;

    const { scrollTop, clientHeight, scrollHeight } = textarea;
    // Get the caret's pixel position within the textarea
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22;
    const caretPos = getCaretPixelTop(textarea);

    // If the caret is in the bottom third of the visible area, scroll down
    const threshold = scrollTop + clientHeight * 0.67;
    if (caretPos > threshold) {
      textarea.scrollTop = caretPos - clientHeight * 0.5;
    }
  }

  function getCaretPixelTop(el) {
    // Mirror trick: measure pixel offset of caret using a hidden div
    const mirror = document.createElement('div');
    const style = getComputedStyle(el);

    const properties = [
      'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
      'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign',
      'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing'
    ];

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';

    properties.forEach(prop => {
      mirror.style[prop] = style[prop];
    });

    const textBeforeCaret = el.value.substring(0, el.selectionStart);
    mirror.textContent = textBeforeCaret;

    const span = document.createElement('span');
    span.textContent = el.value.substring(el.selectionStart) || '.';
    mirror.appendChild(span);

    document.body.appendChild(mirror);
    const top = span.offsetTop;
    document.body.removeChild(mirror);

    return top;
  }
</script>

{#if $previewMode}
  <div class="blotter-preview">{@html renderedHTML}</div>
{:else}
  <textarea
    bind:this={textarea}
    class="blotter-area"
    value={$blotter}
    on:input={handleInput}
    placeholder="Start typing…"
    spellcheck="true"
    autocomplete="off"
  ></textarea>
{/if}

<style>
  .blotter-preview {
    flex: 1;
    padding: 1rem 1.25rem;
    overflow-y: auto;
    font-family: Chicago, Geneva, 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #000;
    background: #fff;
    word-wrap: break-word;
  }

  .blotter-preview :global(h1),
  .blotter-preview :global(h2),
  .blotter-preview :global(h3),
  .blotter-preview :global(h4),
  .blotter-preview :global(h5),
  .blotter-preview :global(h6) {
    margin: 0.75em 0 0.25em;
    font-weight: bold;
    line-height: 1.2;
  }

  .blotter-preview :global(h1) { font-size: 1.6em; }
  .blotter-preview :global(h2) { font-size: 1.35em; }
  .blotter-preview :global(h3) { font-size: 1.15em; }

  .blotter-preview :global(p) {
    margin: 0.5em 0;
  }

  .blotter-preview :global(ul),
  .blotter-preview :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .blotter-preview :global(li) {
    margin: 0.2em 0;
  }

  .blotter-preview :global(code) {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9em;
    background: #e0e0e0;
    padding: 0 3px;
    border: 1px solid #a0a0a0;
  }

  .blotter-preview :global(pre) {
    background: #e0e0e0;
    border: 1px solid #a0a0a0;
    padding: 0.6em 0.8em;
    overflow-x: auto;
    margin: 0.5em 0;
  }

  .blotter-preview :global(pre code) {
    background: none;
    border: none;
    padding: 0;
  }

  .blotter-preview :global(blockquote) {
    border-left: 3px solid #808080;
    margin: 0.5em 0;
    padding-left: 0.75em;
    color: #444;
  }

  .blotter-preview :global(hr) {
    border: none;
    border-top: 1px solid #808080;
    margin: 1em 0;
  }

  .blotter-preview :global(a) {
    color: #000080;
  }

  .blotter-preview :global(strong) {
    font-weight: bold;
  }

  .blotter-preview :global(em) {
    font-style: italic;
  }

  .blotter-preview :global(table) {
    border-collapse: collapse;
    margin: 0.5em 0;
  }

  .blotter-preview :global(th),
  .blotter-preview :global(td) {
    border: 1px solid #808080;
    padding: 3px 8px;
  }

  .blotter-preview :global(th) {
    background: #d0d0d0;
    font-weight: bold;
  }
</style>
