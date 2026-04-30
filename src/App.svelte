<script>
  import { onMount } from 'svelte';
  import MenuBar from './lib/components/MenuBar.svelte';
  import Blotter from './lib/components/Blotter.svelte';
  import { previewMode } from './lib/stores/previewMode.js';
  import { firstVisit } from './lib/stores/blotter.js';

  onMount(async () => {
    if (await firstVisit) previewMode.set(true);
  });
</script>

<div class="app-shell">
  <MenuBar />

  <main class="main-area">
    <div class="window blotter-window">
      <div class="title-bar">
        <span class="title" style="margin: 0 0 0 1rem;">Hotdesk</span>
        <button
          class="btn preview-toggle"
          class:active={$previewMode}
          on:click={() => previewMode.update(v => !v)}
          title="Toggle markdown preview"
        >Markdown</button>
      </div>
      <div class="blotter-pane">
        <Blotter />
      </div>
    </div>
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main-area {
    flex: 1;
    display: flex;
    align-items: stretch;
    padding: 16px;
    overflow: hidden;
    min-height: 0;
  }

  .blotter-window {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .blotter-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
    /* System.css sunken/inset look */
    box-shadow: inset 1px 1px 0 #808080, inset -1px -1px 0 #ffffff;
  }

  .preview-toggle {
    margin-left: auto;
    margin-right: 0;
    margin-top: -0.2rem;
    margin-bottom: -0.2rem;
    align-self: stretch;
    /* override system.css .title-bar button sizing/transform */
    height: auto !important;
    width: auto !important;
    min-width: auto !important;
    transform: none !important;
    font-size: 12px !important;
    padding: 0 12px !important;
    line-height: 1;
    border-radius: 0 !important;
  }

  .preview-toggle.active {
    background: #000 !important;
    color: #fff !important;
    border-radius: 6px !important;
  }
</style>
