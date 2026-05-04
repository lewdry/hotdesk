<script>
  import { onMount } from 'svelte';
  import { blotter, persistence } from '../stores/blotter.js';

  let showAbout = false;
  let showPrivateWarning = false;
  let privateWarningDismissed = false;
  let confirmAction = null; // 'new' | 'reset' | null
  let clock = '';

  $: if ($persistence.mode === 'private' && !privateWarningDismissed) {
    showPrivateWarning = true;
  }

  $: if ($persistence.mode !== 'private') {
    showPrivateWarning = false;
    privateWarningDismissed = false;
  }

  function updateClock() {
    clock = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  onMount(() => {
    updateClock();
    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  });

  function closeAll() {}

  function handleNew() {
    closeAll();
    confirmAction = 'new';
  }

  function handleReset() {
    closeAll();
    confirmAction = 'reset';
  }

  async function confirmYes() {
    if (confirmAction === 'new')   await blotter.clear();
    if (confirmAction === 'reset') await blotter.reset();
    confirmAction = null;
  }

  function confirmNo() {
    confirmAction = null;
  }

  function handleAbout() {
    closeAll();
    showAbout = true;
  }

  function acknowledgePrivateWarning() {
    showPrivateWarning = false;
    privateWarningDismissed = true;
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

  let isSaving = false;

  function buildFilename(content) {
    const words = content
      .replace(/[#*_~`>[\]()!]+/g, ' ')
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
      .filter(Boolean)
      .slice(0, 3);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = words.length ? words.join('-') + '-' : '';
    return `${prefix}${yy}-${mm}-${dd}.md`;
  }

  async function handleSave() {
    if (isSaving) return;
    isSaving = true;
    closeAll();
    try {
      const content = $blotter;
      const filename = buildFilename(content);
      const file = new File([content], filename, { type: 'text/markdown' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Hotdesk' });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          // fall through to download
        }
      }
      const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      isSaving = false;
    }
  }
</script>

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
    <button type="button" class="menu-bar-item" on:click={handleNew}>New</button>
    <button type="button" class="menu-bar-item" on:click={handleReset}>Reset</button>
    <button type="button" class="menu-bar-item" on:click={handleSave}>Save</button>
    <button type="button" class="menu-bar-item" on:click={handleImport}>Load</button>
    <button type="button" class="menu-bar-item" on:click={handleAbout}>About</button>
  </div>

  <div class="menu-bar-right">
    {#if $persistence.message}
      <span
        class="menu-bar-status"
        class:menu-bar-status-warning={$persistence.mode !== 'persistent'}
        aria-live="polite"
        title={$persistence.message}
      >{$persistence.mode === 'memory'
        ? 'Memory only'
        : $persistence.mode === 'private'
          ? 'Private window'
          : 'Fallback storage'}</span>
    {/if}
    <span class="menu-bar-clock" aria-label="Current time">{clock}</span>
  </div>
</div>

<!-- Confirm dialog -->
{#if confirmAction}
  <div class="about-overlay" role="presentation">
    <button type="button" class="dialog-backdrop" aria-label="Close confirmation dialog" on:click={confirmNo}></button>
    <div class="window confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="title-bar">
        <span class="title" id="confirm-title">{confirmAction === 'new' ? 'New' : 'Reset'}</span>
      </div>
      <div class="window-pane confirm-body">
        <p>You will lose your current work. Are you sure?</p>
        <div class="confirm-buttons">
          <button class="btn" on:click={confirmYes}>Yes</button>
          <button class="btn" on:click={confirmNo}>No</button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showPrivateWarning}
  <div class="about-overlay" role="presentation">
    <div class="window confirm-dialog private-warning-dialog" role="dialog" aria-modal="true" aria-labelledby="private-warning-title">
      <div class="title-bar">
        <span class="title" id="private-warning-title">Private/Incognito Mode</span>
      </div>
      <div class="window-pane confirm-body private-warning-body">
        <p>Hotdesk can't autosave your work in Private/Incognito mode. Please save your work manually, or open a non-Private tab.</p>
        <div class="confirm-buttons">
          <button class="btn" on:click={acknowledgePrivateWarning}>OK</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- About dialog -->
{#if showAbout}
  <div class="about-overlay" role="presentation">
    <button type="button" class="dialog-backdrop" aria-label="Close about dialog" on:click={() => showAbout = false}></button>
    <div class="window about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div class="title-bar">
        <span class="title" id="about-title">About Hotdesk</span>
      </div>
      <div class="window-pane about-body">
        <p><strong>Hotdesk v1.0</strong></p>
        <p>A persistent, distraction-free notepad by Lewis Dryburgh.</p>
        <div class="about-section">
          <p class="about-label">Made with:</p>
          <ul class="about-list">
            <li><strong>Interface:</strong> System.css by Sakun Acharige.</li>
            <li><strong>Markdown Engine:</strong> Marked by Christopher Jeffrey and MarkedJS Community.</li>
            <li><strong>Data Safety:</strong> DOMPurify by Cure53.</li>
            <li><strong>Storage:</strong> idb by Jake Archibald.</li>
          </ul>
        </div>
        <div class="about-section">
          <p class="about-label">Inspiration:</p>
          <p>Based on the "read-write" web philosophy of Tim Berners-Lee.</p>
        </div>
        <div class="about-section">
          <p>Hotdesk is local-first. Your notes are stored in your browser and never leave your device, unless you share them.</p>
        </div>
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
    padding: 0 24px;
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
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .menu-bar-item:hover,
  .menu-bar-item:focus-visible {
    background: #000;
    color: #fff;
    outline: none;
  }

  .menu-bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    padding-right: 12px;
  }

  .menu-bar-status {
    max-width: min(40vw, 280px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-bar-status-warning {
    color: #7a1f1f;
  }

  .menu-bar-clock {
    cursor: default;
    min-width: 3.5ch;
  }

  @media (max-width: 480px) {
    .menu-bar {
      padding: 0 4px 0 0;
    }

    .menu-bar-item {
      padding: 2px 6px 2px 4px;
    }

    .menu-bar-right {
      padding-right: 4px;
    }
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

  .dialog-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: transparent;
    padding: 0;
  }

  .about-dialog {
    width: 360px;
    max-width: calc(100vw - 32px);
    position: relative;
    z-index: 1;
  }

  .about-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    align-items: center;
    text-align: center;
  }

  .about-section {
    width: 100%;
    text-align: left;
  }

  .about-label {
    font-weight: bold;
    margin-bottom: 2px;
  }

  .about-list {
    margin: 0 0 0 16px;
    padding: 0;
    list-style: disc;
  }

  .about-list li {
    margin-bottom: 2px;
  }

  .about-body .btn {
    margin-top: 8px;
  }

  /* Confirm dialog */
  .confirm-dialog {
    width: 280px;
    max-width: calc(100vw - 32px);
    position: relative;
    z-index: 1;
  }

  .confirm-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 13px;
    align-items: center;
    text-align: center;
  }

  .confirm-buttons {
    display: flex;
    gap: 8px;
  }

  .private-warning-dialog {
    width: 340px;
  }

  .private-warning-body {
    align-items: stretch;
  }

</style>
