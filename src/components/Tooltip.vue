<template>
  <div 
    v-if="visible" 
    class="custom-tooltip"
    :style="{ 
      left: x + 'px', 
      top: y + 'px' 
    }"
  >
    {{ text }}
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

defineProps<Props>();
</script>

<style scoped>
.custom-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  transform: translateX(-50%);
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 暗色模式下的悬浮提示 */
.docly-editor.dark-theme .custom-tooltip {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
}
</style>