<script>
  import { blotter } from '../stores/blotter.js';

  let showAbout = false;
  let confirmAction = null; // 'new' | 'reset' | null

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

  async function handleSave() {
    if (isSaving) return;
    isSaving = true;
    closeAll();
    try {
      const content = $blotter;
      const file = new File([content], 'hotdesk.md', { type: 'text/markdown' });
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
      a.download = 'hotdesk.md';
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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->

<!-- System.css menu bar -->
<div class="menu-bar">
  <div class="menu-bar-left">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click={handleNew}>New</div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click={handleReset}>Reset</div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click={handleSave}>Save</div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click={handleImport}>Load</div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-bar-item" on:click={handleAbout}>About</div>
  </div>

  <div class="menu-bar-right">
    <span class="menu-bar-clock">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
  </div>
</div>

<!-- Confirm dialog -->
{#if confirmAction}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="about-overlay" on:click={confirmNo}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="window confirm-dialog" on:click|stopPropagation>
      <div class="title-bar">
        <span class="title">{confirmAction === 'new' ? 'New' : 'Reset'}</span>
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
  }

  .menu-bar-item:hover,
  .menu-bar-item:focus-within {
    background: #000;
    color: #fff;
  }

  .menu-bar-right {
    font-size: 14px;
    padding-right: 12px;
  }

  .menu-bar-clock {
    cursor: default;
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

  .about-dialog {
    width: 360px;
    max-width: calc(100vw - 32px);
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

</style>
