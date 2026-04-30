<script>
  import { blotter } from '../stores/blotter.js';

  let fileOpen = false;
  let viewOpen = false;
  let showAbout = false;
  let showMarkdownGuide = false;

  function closeAll() {
    fileOpen = false;
    viewOpen = false;
  }

  async function handleClear() {
    closeAll();
    if (confirm('Clear the blotter? This cannot be undone.')) {
      await blotter.clear();
    }
  }

  function handleAbout() {
    closeAll();
    showAbout = true;
  }

  function handleMarkdownGuide() {
    closeAll();
    showMarkdownGuide = true;
  }

  let fileInput;

  function handleImport() {
    closeAll();
    fileInput.click();
  }

  async function onFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    blotter.set(text);
    // Reset so the same file can be re-imported
    e.target.value = '';
  }

  function handleSave() {
    closeAll();
    const content = $blotter;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotdesk.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<svelte:window on:click={closeAll} />
<input
  bind:this={fileInput}
  type="file"
  accept=".md,text/markdown"
  style="display:none"
  on:change={onFileSelected}
/>

<!-- System.css menu bar -->
<div class="menu-bar">
  <div class="menu-bar-left">
    <!-- File menu -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click|stopPropagation={() => { fileOpen = !fileOpen; viewOpen = false; }}>
      File
      {#if fileOpen}
        <ul class="menu" role="menu">
          <li class="menu-item" role="menuitem" tabindex="0" on:click={handleSave} on:keydown={e => e.key === 'Enter' && handleSave()}>Save</li>
          <li class="menu-separator" role="separator"></li>
          <li class="menu-item" role="menuitem" tabindex="0" on:click={handleImport} on:keydown={e => e.key === 'Enter' && handleImport()}>Import</li>
          <li class="menu-separator" role="separator"></li>
          <li class="menu-item" role="menuitem" tabindex="0" on:click={handleClear} on:keydown={e => e.key === 'Enter' && handleClear()}>Clear</li>
          <li class="menu-separator" role="separator"></li>
          <li class="menu-item" role="menuitem" tabindex="0" on:click={handleAbout} on:keydown={e => e.key === 'Enter' && handleAbout()}>About</li>
        </ul>
      {/if}
    </div>

    <!-- View menu -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click|stopPropagation={() => { viewOpen = !viewOpen; fileOpen = false; }}>
      View
      {#if viewOpen}
        <ul class="menu" role="menu">
          <li class="menu-item" role="menuitem" tabindex="0" on:click={handleMarkdownGuide} on:keydown={e => e.key === 'Enter' && handleMarkdownGuide()}>Markdown Guide</li>
          <li class="menu-separator" role="separator"></li>
          <li class="menu-item disabled" role="menuitem" aria-disabled="true">More options in v2…</li>
        </ul>
      {/if}
    </div>
  </div>

  <div class="menu-bar-right">
    <span class="menu-bar-clock">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
</div>

<!-- Markdown Guide dialog -->
{#if showMarkdownGuide}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="about-overlay" on:click={() => showMarkdownGuide = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="window md-guide-dialog" on:click|stopPropagation>
      <div class="title-bar">
        <button class="close" aria-label="Close" on:click={() => showMarkdownGuide = false}></button>
        <span class="title">Markdown Guide</span>
      </div>
      <div class="window-pane md-guide-body">
        <table class="md-table">
          <tbody>
            <tr><td class="md-syntax"># Heading 1</td><td class="md-desc">H1</td></tr>
            <tr><td class="md-syntax">## Heading 2</td><td class="md-desc">H2</td></tr>
            <tr><td class="md-syntax">### Heading 3</td><td class="md-desc">H3</td></tr>
            <tr class="md-sep"><td colspan="2"></td></tr>
            <tr><td class="md-syntax">**bold**</td><td class="md-desc"><strong>bold</strong></td></tr>
            <tr><td class="md-syntax">*italic*</td><td class="md-desc"><em>italic</em></td></tr>
            <tr><td class="md-syntax">~~strike~~</td><td class="md-desc"><s>strike</s></td></tr>
            <tr><td class="md-syntax">`code`</td><td class="md-desc"><code>code</code></td></tr>
            <tr class="md-sep"><td colspan="2"></td></tr>
            <tr><td class="md-syntax">- item</td><td class="md-desc">Bullet list</td></tr>
            <tr><td class="md-syntax">1. item</td><td class="md-desc">Numbered list</td></tr>
            <tr><td class="md-syntax">> text</td><td class="md-desc">Blockquote</td></tr>
            <tr class="md-sep"><td colspan="2"></td></tr>
            <tr><td class="md-syntax">---</td><td class="md-desc">Horizontal rule</td></tr>
            <tr><td class="md-syntax">[text](url)</td><td class="md-desc">Link</td></tr>
          </tbody>
        </table>
        <button class="btn" on:click={() => showMarkdownGuide = false}>OK</button>
      </div>
    </div>
  </div>
{/if}

<!-- About dialog -->
{#if showAbout}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="about-overlay" on:click={() => showAbout = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="window about-dialog" on:click|stopPropagation>
      <div class="title-bar">
        <button class="close" aria-label="Close" on:click={() => showAbout = false}></button>
        <span class="title">About Hotdesk</span>
      </div>
      <div class="window-pane about-body">
        <p><strong>Hotdesk</strong></p>
        <p>Version 1.0</p>
        <p>A persistent, distraction-free notepad by Lewis Dryburgh.</p>
        <button class="btn" on:click={() => showAbout = false}>OK</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .menu-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    user-select: none;
    position: relative;
    z-index: 100;
    font-family: Chicago, Geneva, 'Helvetica Neue', sans-serif;
  }

  .menu-bar-left {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .menu-bar-item {
    position: relative;
    padding: 2px 10px;
    cursor: default;
    font-size: 14px;
    white-space: nowrap;
  }

  .menu-bar-item:hover,
  .menu-bar-item:focus-within {
    background: #000;
    color: #fff;
  }

  .menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: #fff;
    border: 1px solid #000;
    box-shadow: 2px 2px 0 #000;
    list-style: none;
    min-width: 160px;
    padding: 2px 0;
    z-index: 200;
    color: #000;
  }

  .menu-item {
    padding: 3px 20px;
    font-size: 14px;
    cursor: default;
    white-space: nowrap;
  }

  .menu-item:hover:not(.disabled) {
    background: #000;
    color: #fff;
  }

  .menu-item.disabled {
    color: #888;
    cursor: default;
  }

  .menu-separator {
    height: 1px;
    background: #888;
    margin: 2px 0;
  }

  .menu-bar-right {
    font-size: 14px;
    padding-right: 4px;
  }

  .menu-bar-clock {
    cursor: default;
  }

  /* About dialog */
  .about-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }

  .about-dialog {
    width: 280px;
  }

  .about-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    align-items: center;
    text-align: center;
  }

  .about-body .btn {
    margin-top: 8px;
  }

  /* Markdown Guide dialog */
  .md-guide-dialog {
    width: 340px;
  }

  .md-guide-body {
    padding: 12px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 13px;
    align-items: center;
  }

  .md-table {
    width: 100%;
    border-collapse: collapse;
  }

  .md-table td {
    padding: 2px 8px;
    vertical-align: middle;
  }

  .md-syntax {
    font-family: Monaco, Menlo, monospace;
    font-size: 14px !important;
    white-space: nowrap;
    width: 50%;
  }

  .md-desc {
    font-size: 14px !important;
  }

  .md-desc {
    color: #333;
  }

  .md-sep td {
    padding: 3px 0;
    border-bottom: 1px solid #ccc;
  }

  .md-guide-body .btn {
    margin-top: 4px;
  }
</style>
