<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Docly - 文档编辑器</h1>
    </header>
    <main class="app-main">
      <DoclyEditor />
    </main>
  </div>
</template>

<script setup>
import DoclyEditor from './components/DoclyEditor.vue'
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  padding: 16px 24px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.app-main {
  flex: 1;
  padding: 24px;
  background-color: #f5f5f5;
  overflow: hidden;
}
</style>
