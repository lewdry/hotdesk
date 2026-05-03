<script>
  import MenuBar from './lib/components/MenuBar.svelte';
  import Blotter from './lib/components/Blotter.svelte';
</script>

<div class="app-shell">
  <MenuBar />

  <main class="main-area">
    <div class="window blotter-window">
      <div class="title-bar">
        <span class="title" style="margin: 0 0 0 1rem;">Hotdesk</span>
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
    padding: 6px 16px 16px;
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

  @media (max-width: 480px) {
    .main-area {
      padding: 6px 4px 4px;
    }

    .blotter-window {
      margin: 0;
    }
  }
</style>
