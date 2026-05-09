<script>
  export let active = {};
  export let onFormat = () => {};

  function handleClick(fmt, e) {
    e.preventDefault();
    onFormat(fmt);
  }
</script>

<!-- Formatting toolbar -->
<div class="fmt-toolbar">
  <button
    class="fmt-btn fmt-bold"
    class:active={active.bold}
    aria-pressed={active.bold ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('bold', e)}
    title="Bold"
  ><strong>B</strong></button>

  <button
    class="fmt-btn fmt-italic"
    class:active={active.italic}
    aria-pressed={active.italic ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('italic', e)}
    title="Italic"
  ><em>I</em></button>

  <button
    class="fmt-btn fmt-strike"
    class:active={active.strikethrough}
    aria-pressed={active.strikethrough ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('strikethrough', e)}
    title="Strikethrough"
  ><s>S</s></button>

  <div class="fmt-sep"></div>

  <button
    class="fmt-btn"
    class:active={active.h1}
    aria-pressed={active.h1 ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('h1', e)}
    title="Heading 1"
  >H1</button>

  <button
    class="fmt-btn"
    class:active={active.h2}
    aria-pressed={active.h2 ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('h2', e)}
    title="Heading 2"
  >H2</button>

  <button
    class="fmt-btn"
    class:active={active.body}
    aria-pressed={active.body ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('body', e)}
    title="Body text"
  >¶</button>

  <div class="fmt-sep"></div>

  <button
    class="fmt-btn"
    class:active={active.bullet}
    aria-pressed={active.bullet ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('bullet', e)}
    title="Bullet list"
  >•</button>

  <button
    class="fmt-btn fmt-ordered"
    class:active={active.ordered}
    aria-pressed={active.ordered ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('ordered', e)}
    title="Numbered list"
  >1.</button>

  <button
    class="fmt-btn"
    class:active={active.quote}
    aria-pressed={active.quote ? 'true' : 'false'}
    on:mousedown|preventDefault
    on:click={(e) => handleClick('quote', e)}
    title="Blockquote"
  >"</button>

</div>

<style>
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
  .fmt-strike s      { text-decoration: line-through; }
  .fmt-ordered       { font-size: 12px; letter-spacing: -0.5px; }

  .fmt-sep {
    width: 1px;
    height: 16px;
    background: var(--color-border);
    margin: 0 3px;
    flex-shrink: 0;
  }
</style>
