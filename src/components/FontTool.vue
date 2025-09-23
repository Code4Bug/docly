<template>
  <div class="font-tool">
    <!-- 字体族选择 -->
    <div class="font-control">
      <select 
        :value="currentFontFamily" 
        @change="handleFontFamilyChange" 
        class="font-select"
        @mouseenter="showTooltip($event, '字体族')"
        @mouseleave="hideTooltip"
      >
        <option value="Arial, sans-serif">Arial</option>
        <option value="'Times New Roman', serif">Times New Roman</option>
        <option value="'Courier New', monospace">Courier New</option>
        <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
        <option value="'SimSun', serif">宋体</option>
        <option value="'SimHei', sans-serif">黑体</option>
        <option value="'KaiTi', serif">楷体</option>
        <option value="'FangSong', serif">仿宋</option>
        <option value="'Helvetica Neue', sans-serif">Helvetica Neue</option>
        <option value="'Georgia', serif">Georgia</option>
      </select>
    </div>

    <!-- 字体大小选择 -->
    <div class="font-control">
      <select 
        :value="currentFontSize" 
        @change="handleFontSizeChange" 
        class="font-size-select"
        @mouseenter="showTooltip($event, '字体大小')"
        @mouseleave="hideTooltip"
      >
        <option value="10px">10</option>
        <option value="11px">11</option>
        <option value="12px">12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="20px">20</option>
        <option value="24px">24</option>
        <option value="28px">28</option>
        <option value="32px">32</option>
        <option value="36px">36</option>
        <option value="48px">48</option>
      </select>
    </div>

    <!-- 字体样式按钮组 -->
    <div class="font-style-group">
      <button 
        @click="$emit('font-style-change', 'increase-size')" 
        class="font-btn"
        @mouseenter="showTooltip($event, '增大字体')"
        @mouseleave="hideTooltip"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H9M19,8V11H16V13H19V16H21V13H24V11H21V8H19Z" fill="currentColor"/>
        </svg>
      </button>
      <button 
        @click="$emit('font-style-change', 'decrease-size')" 
        class="font-btn"
        @mouseenter="showTooltip($event, '减小字体')"
        @mouseleave="hideTooltip"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H9M19,11V13H24V11H19Z" fill="currentColor"/>
        </svg>
      </button>
    </div>

    <!-- 自定义悬浮提示 -->
    <div 
      v-if="tooltip.visible" 
      class="font-tooltip"
      :style="{ 
        left: tooltip.x + 'px', 
        top: tooltip.y + 'px' 
      }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Props
interface Props {
  currentFontFamily?: string;
  currentFontSize?: string;
}

withDefaults(defineProps<Props>(), {
  currentFontFamily: 'Arial, sans-serif',
  currentFontSize: '14px'
});

// Emits
const emit = defineEmits<{
  'font-family-change': [fontFamily: string];
  'font-size-change': [fontSize: string];
  'font-style-change': [action: string];
}>();

// 悬浮提示相关状态
const tooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0
});

/**
 * 处理字体族变化
 * @param {Event} event - 选择事件
 */
const handleFontFamilyChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  emit('font-family-change', target.value);
};

/**
 * 处理字体大小变化
 * @param {Event} event - 选择事件
 */
const handleFontSizeChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  emit('font-size-change', target.value);
};

/**
 * 显示悬浮提示
 * @param event - 鼠标事件
 * @param text - 提示文本
 */
const showTooltip = (event: MouseEvent, text: string): void => {
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  
  tooltip.value = {
    visible: true,
    text,
    x: rect.left + rect.width / 2,
    y: rect.bottom + 8
  };
};

/**
 * 隐藏悬浮提示
 */
const hideTooltip = (): void => {
  tooltip.value.visible = false;
};
</script>

<script lang="ts">
export default {
  name: 'FontTool'
};
</script>

<style scoped>
.font-tool {
  display: flex;
  align-items: center;
  gap: 8px;
}

.font-control {
  display: flex;
  align-items: center;
}

.font-select {
  height: 34px;
  padding: 8px 28px 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background-color: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: calc(100% - 8px) center;
  background-size: 14px 14px;
  min-width: 120px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.font-size-select {
  height: 34px;
  padding: 8px 28px 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background-color: #ffffff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: calc(100% - 8px) center;
  background-size: 14px 14px;
  min-width: 70px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.font-select:hover,
.font-size-select:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.font-select:focus,
.font-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.font-style-group {
  display: flex;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.font-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  /* border-right: 1px solid #e1e5e9; */
  background: transparent;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.font-btn:last-child {
  border-right: none;
}

.font-btn:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.font-btn:active {
  transform: translateY(0);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
}

.font-btn svg {
  pointer-events: none;
  fill: currentColor;
  color: inherit;
}

/* 悬浮提示样式 */
.font-tooltip {
  position: fixed;
  background: linear-gradient(135deg, #1f2937, #374151);
  color: #ffffff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  transform: translateX(-50%);
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .font-select {
    min-width: 100px;
    font-size: 12px;
  }
  
  .font-size-select {
    min-width: 50px;
    font-size: 12px;
  }
  
  .font-btn {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .font-tool {
    gap: 4px;
  }
  
  .font-select {
    min-width: 80px;
    font-size: 11px;
  }
  
  .font-size-select {
    min-width: 40px;
    font-size: 11px;
  }
  
  .font-btn {
    width: 24px;
    height: 24px;
  }
}
</style>