<template>
  <div class="docly-toolbar" :class="{ 'dark-theme': isDarkTheme }">
    <div class="toolbar-container">
      <!-- 左侧功能区域 -->
      <div class="toolbar-left">
        <!-- 文件操作和撤销重做 -->
        <div class="toolbar-row">
          <div class="toolbar-section file-operations">
            <div class="button-group">
              <button
                @click="$emit('import-file')"
                class="toolbar-btn"
                @mouseenter="showTooltip($event, '导入文档')"
                @mouseleave="hideTooltip"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"
                  />
                </svg>
              </button>
              <button
                @click="$emit('export-file')"
                class="toolbar-btn"
                @mouseenter="showTooltip($event, '导出文档')"
                @mouseleave="hideTooltip"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"
                  />
                </svg>
              </button>
            </div>
            <div class="button-group">
              <button
                @click="$emit('undo')"
                class="toolbar-btn"
                @mouseenter="showTooltip($event, '撤销')"
                @mouseleave="hideTooltip"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z"
                  />
                </svg>
              </button>
              <button
                @click="$emit('redo')"
                class="toolbar-btn"
                @mouseenter="showTooltip($event, '重做')"
                @mouseleave="hideTooltip"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M18.4,10.6C16.55,9 14.15,8 11.5,8C6.85,8 2.92,11.03 1.53,15.22L3.9,16C4.95,12.81 7.96,10.5 11.5,10.5C13.46,10.5 15.23,11.22 16.62,12.38L13,16H22V7L18.4,10.6Z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 第一类：字体相关功能区域 -->
        <div class="toolbar-category font-category">
          <!-- 第一行：字体、字号、增减 -->
          <div class="toolbar-row">
            <div class="toolbar-section">
              <FontTool
                :current-font-family="currentFontFamily"
                :current-font-size="currentFontSize"
                @font-family-change="handleFontFamilyChange"
                @font-size-change="handleFontSizeChange"
                @font-style-change="handleFontStyleChange"
              />
            </div>
          </div>
          <!-- 第二行：粗体、斜体、下划线、字体颜色 -->
          <div class="toolbar-row">
            <div class="toolbar-section">
              <div class="button-group">
                <button
                  @click="$emit('format-text', 'bold')"
                  class="toolbar-btn"
                  :class="{ active: isFormatActive('bold') }"
                  @mouseenter="showTooltip($event, '粗体')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M13.5,15.5H10V12.5H13.5A1.5,1.5 0 0,1 15,14A1.5,1.5 0 0,1 13.5,15.5M10,6.5H13A1.5,1.5 0 0,1 14.5,8A1.5,1.5 0 0,1 13,9.5H10M15.6,10.79C16.57,10.11 17.25,9.02 17.25,8C17.25,5.74 15.5,4 13.25,4H7V18H14.04C16.14,18 17.75,16.3 17.75,14.21C17.75,12.69 16.89,11.39 15.6,10.79Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('format-text', 'italic')"
                  class="toolbar-btn"
                  :class="{ active: isFormatActive('italic') }"
                  @mouseenter="showTooltip($event, '斜体')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M10,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H10Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('format-text', 'underline')"
                  class="toolbar-btn"
                  :class="{ active: isFormatActive('underline') }"
                  @mouseenter="showTooltip($event, '下划线')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M5,21H19V19H5V21M12,17A6,6 0 0,0 18,11V3H15.5V11A3.5,3.5 0 0,1 12,14.5A3.5,3.5 0 0,1 8.5,11V3H6V11A6,6 0 0,0 12,17Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('format-text', 'strike')"
                  class="toolbar-btn"
                  :class="{ active: isFormatActive('strike') }"
                  @mouseenter="showTooltip($event, '删除线')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M3,14H21V12H3M5,4V7H10V10H14V7H19V4M10,19H14V16H10V19Z"
                    />
                  </svg>
                </button>
              </div>

              <div class="toolbar-section">
                <div class="button-group">
                  <button
                    @click="$emit('format-text', 'superscript')"
                    class="toolbar-btn"
                    :class="{ active: isFormatActive('superscript') }"
                    @mouseenter="showTooltip($event, '上标')"
                    @mouseleave="hideTooltip"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M16,7.41L11.41,12L16,16.59L14.59,18L10,13.41L5.41,18L4,16.59L8.59,12L4,7.41L5.41,6L10,10.59L14.59,6L16,7.41M21.85,9H16.97L20.09,5.89C20.42,5.56 20.42,5 20.09,4.67C19.76,4.34 19.2,4.34 18.87,4.67L15.04,8.5C14.71,8.83 14.71,9.39 15.04,9.72L18.87,13.55C19.2,13.88 19.76,13.88 20.09,13.55C20.42,13.22 20.42,12.66 20.09,12.33L16.97,9.22H21.85C22.3,9.22 22.67,8.85 22.67,8.4C22.67,7.95 22.3,7.58 21.85,7.58Z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="$emit('format-text', 'subscript')"
                    class="toolbar-btn"
                    :class="{ active: isFormatActive('subscript') }"
                    @mouseenter="showTooltip($event, '下标')"
                    @mouseleave="hideTooltip"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M16,7.41L11.41,12L16,16.59L14.59,18L10,13.41L5.41,18L4,16.59L8.59,12L4,7.41L5.41,6L10,10.59L14.59,6L16,7.41M22,16H17.14L20.25,12.89C20.59,12.56 20.59,12 20.25,11.67C19.92,11.34 19.36,11.34 19.03,11.67L15.2,15.5C14.87,15.83 14.87,16.39 15.2,16.72L19.03,20.55C19.36,20.88 19.92,20.88 20.25,20.55C20.59,20.22 20.59,19.66 20.25,19.33L17.14,16.22H22C22.45,16.22 22.82,15.85 22.82,15.4C22.82,14.95 22.45,14.58 22,14.58Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="toolbar-section">
                <ColorPicker
                  type="text"
                  :current-color="currentTextColor"
                  @color-change="handleTextColorChange"
                />
                <ColorPicker
                  type="background"
                  :current-color="currentBgColor"
                  @color-change="handleBgColorChange"
                />
              </div>
            </div>
          </div>
          <!-- 第二行：标题级别、对齐方式 -->
        </div>

        <!-- 第二类：内容和布局功能区域 -->
        <div class="toolbar-category content-category">
          <div class="toolbar-row">
            <div class="toolbar-section">
              <select
                :value="currentHeading"
                @change="handleHeadingChange"
                class="compact-select"
                @mouseenter="showTooltip($event, '标题级别')"
                @mouseleave="hideTooltip"
              >
                <option value="">正文</option>
                <option value="1">标题 1</option>
                <option value="2">标题 2</option>
                <option value="3">标题 3</option>
              </select>
            </div>
            <div class="toolbar-section">
              <div class="button-group">
                <button
                  @click="$emit('set-alignment', 'left')"
                  class="toolbar-btn"
                  :class="{ active: currentAlignment === 'left' }"
                  @mouseenter="showTooltip($event, '左对齐')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('set-alignment', 'center')"
                  class="toolbar-btn"
                  :class="{ active: currentAlignment === 'center' }"
                  @mouseenter="showTooltip($event, '居中对齐')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M3,3H21V5H3V3M7,7H17V9H7V7M3,11H21V13H3V11M7,15H17V17H7V15M3,19H21V21H3V19Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('set-alignment', 'right')"
                  class="toolbar-btn"
                  :class="{ active: currentAlignment === 'right' }"
                  @mouseenter="showTooltip($event, '右对齐')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M3,3H21V5H3V3M9,7H21V9H9V7M3,11H21V13H3V11M9,15H21V17H9V15M3,19H21V21H3V19Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('set-alignment', 'justify')"
                  class="toolbar-btn"
                  :class="{ active: currentAlignment === 'justify' }"
                  @mouseenter="showTooltip($event, '两端对齐')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z"
                    />
                  </svg>
                </button>
              </div>

              <div class="button-group">
                <button
                  @click="$emit('insert-list', 'unordered')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '无序列表')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('insert-list', 'ordered')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '有序列表')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M7,13V11H21V13H7M7,19V17H21V19H7M7,7V5H21V7H7M3,8V5H2V4H4V8H3M2,17V16H5V20H2V19H4V18.5H3V17.5H4V17H2M4.25,10A0.75,0.75 0 0,1 5,10.75C5,10.95 4.92,11.14 4.79,11.27L3.12,13H5V14H2V13.08L4,11H2V10H4.25Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <!-- 第一行：列表、表格、链接、引用 -->
          <div class="toolbar-row">
            <div class="toolbar-section">
              <TableSizeSelector
                @table-size-selected="handleTableSizeSelected"
                @custom-table-requested="handleCustomTableRequested"
              />

              <!-- 表格操作按钮组 -->
              <div class="button-group table-operations">
                <button
                  @click="$emit('add-column-before')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '在前面插入列')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M13,2A2,2 0 0,1 15,4V20A2,2 0 0,1 13,22H11A2,2 0 0,1 9,20V4A2,2 0 0,1 11,2H13M13,4H11V20H13V4M17,13H19V11H17V8L14,12L17,16V13M7,16V13H5V11H7V8L10,12L7,16Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('add-column-after')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '在后面插入列')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M11,2A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H9A2,2 0 0,1 7,20V4A2,2 0 0,1 9,2H11M11,4H9V20H11V4M15,8V11H17V13H15V16L18,12L15,8M5,8L8,12L5,16V13H3V11H5V8Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('delete-column')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '删除当前列')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M4,2A2,2 0 0,1 6,4V20A2,2 0 0,1 4,22H2A2,2 0 0,1 0,20V4A2,2 0 0,1 2,2H4M4,4H2V20H4V4M22,2A2,2 0 0,1 24,4V20A2,2 0 0,1 22,22H20A2,2 0 0,1 18,20V4A2,2 0 0,1 20,2H22M22,4H20V20H22V4M9,6V8H15V6H9M9,10V12H15V10H9M9,14V16H15V14H9M9,18V20H15V18H9Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('add-row-before')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '在上方插入行')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M22,13A2,2 0 0,1 20,15H4A2,2 0 0,1 2,13V11A2,2 0 0,1 4,9H20A2,2 0 0,1 22,11V13M20,13V11H4V13H20M16,7V5H13V7H11V5H8L12,1L16,5V7M8,19V17H11V19H13V17H16L12,21L8,17V19Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('add-row-after')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '在下方插入行')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M2,11A2,2 0 0,1 4,9H20A2,2 0 0,1 22,11V13A2,2 0 0,1 20,15H4A2,2 0 0,1 2,13V11M4,11V13H20V11H4M8,5V7H11V5H13V7H16L12,11L8,7V5M16,19V17H13V19H11V17H8L12,21L16,17V19Z"
                    />
                  </svg>
                </button>
                <button
                  @click="$emit('delete-row')"
                  class="toolbar-btn"
                  @mouseenter="showTooltip($event, '删除当前行')"
                  @mouseleave="hideTooltip"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M9.41,13L12,15.59L14.59,13L16,14.41L13.41,17L16,19.59L14.59,21L12,18.41L9.41,21L8,19.59L10.59,17L8,14.41L9.41,13M22,9A2,2 0 0,1 20,11H4A2,2 0 0,1 2,9V7A2,2 0 0,1 4,5H20A2,2 0 0,1 22,7V9M20,9V7H4V9H20Z"
                    />
                  </svg>
                </button>
              </div>

              <button
                @click="$emit('insert-link')"
                class="toolbar-btn"
                @mouseenter="showTooltip($event, '插入链接')"
                @mouseleave="hideTooltip"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"
                  />
                </svg>
              </button>
              <button
                @click="$emit('insert-quote')"
                class="toolbar-btn"
                @mouseenter="showTooltip($event, '插入引用')"
                @mouseleave="hideTooltip"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧批注功能区域 -->
      <div class="toolbar-right">
        <div class="toolbar-section annotation-section">
          <button
            @click="$emit('toggle-annotation-mode')"
            class="toolbar-btn"
            :class="{ active: annotationMode }"
            @mouseenter="showTooltip($event, '添加批注')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22H9M10,16V19.08L13.08,16H20V4H4V16H10M6,7H18V9H6V7M6,11H16V13H6V11Z"
              />
            </svg>
          </button>
          <button
            @click="$emit('show-annotation-list')"
            class="toolbar-btn"
            :class="{ 'annotation-open': showAnnotationPanel }"
            @mouseenter="showTooltip($event, '显示批注列表')"
            @mouseleave="hideTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,20L1.5,16.5L2.91,15.09L5,17.17L9.59,12.59L11,14L5,20Z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Tooltip 组件 -->
    <Tooltip
      :visible="tooltip.visible"
      :text="tooltip.text"
      :x="tooltip.x"
      :y="tooltip.y"
    />
  </div>
</template>

<script setup lang="ts">
import { useTheme } from "../composables/useTheme";
import { useTooltip } from "../composables/useTooltip";
import ColorPicker from "./ColorPicker.vue";
import FontTool from "./FontTool.vue";
import Tooltip from "./Tooltip.vue";
import TableSizeSelector from "./TableSizeSelector.vue";

// 主题系统
const { isDarkTheme } = useTheme();

// Tooltip 功能
const { tooltip, showTooltip, hideTooltip } = useTooltip();

// 确保 TypeScript 识别这些变量在模板中被使用
// 这些变量实际在模板的事件处理器和组件绑定中使用
const _tooltipRefs = { tooltip, showTooltip, hideTooltip };

// Props
interface Props {
  currentHeading?: string;
  currentAlignment?: string;
  currentTextColor?: string;
  currentBgColor?: string;
  currentFontFamily?: string;
  currentFontSize?: string;
  isExporting?: boolean;
  annotationMode?: boolean;
  showAnnotationPanel?: boolean;
  readOnly?: boolean;
}

withDefaults(defineProps<Props>(), {
  currentHeading: "",
  currentAlignment: "left",
  currentTextColor: "#000000",
  currentBgColor: "#ffffff",
  currentFontFamily: "Arial, sans-serif",
  currentFontSize: "10.5pt",
  isExporting: false,
  annotationMode: false,
  showAnnotationPanel: false,
  readOnly: false,
});

// Emits
const emit = defineEmits<{
  "import-file": [];
  "export-file": [];
  undo: [];
  redo: [];
  "change-heading": [value: string];
  "format-text": [format: string];
  "set-alignment": [alignment: string];
  "text-color-change": [color: string];
  "bg-color-change": [color: string];
  "font-family-change": [fontFamily: string];
  "font-size-change": [fontSize: string];
  "font-style-change": [action: string];
  "insert-list": [type: string];
  "insert-link": [];
  "insert-table": [size?: { rows: number; cols: number }];
  "insert-quote": [];
  "add-column-before": [];
  "add-column-after": [];
  "delete-column": [];
  "add-row-before": [];
  "add-row-after": [];
  "delete-row": [];
  "toggle-annotation-mode": [];
  "show-annotation-list": [];
}>();

/**
 * 检查格式是否激活
 * @param {string} format - 格式类型
 * @returns {boolean} 是否激活
 */
const isFormatActive = (format: string): boolean => {
  try {
    return document.queryCommandState(format);
  } catch (error) {
    return false;
  }
};

/**
 * 处理标题级别变化
 * @param {Event} event - 选择事件
 */
const handleHeadingChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  emit("change-heading", target.value);
};

/**
 * 处理字体系列变化
 * @param {string} fontFamily - 字体系列
 */
const handleFontFamilyChange = (fontFamily: string): void => {
  emit("font-family-change", fontFamily);
};

/**
 * 处理字体大小变化
 * @param {string} fontSize - 字体大小
 */
const handleFontSizeChange = (fontSize: string): void => {
  emit("font-size-change", fontSize);
};

/**
 * 处理字体样式变化
 * @param {string} action - 样式操作
 */
const handleFontStyleChange = (action: string): void => {
  emit("font-style-change", action);
};

/**
 * 处理文本颜色变化
 * @param {string} color - 颜色值
 */
const handleTextColorChange = (color: string): void => {
  emit("text-color-change", color);
};

/**
 * 处理背景颜色变化
 * @param {string} color - 颜色值
 */
const handleBgColorChange = (color: string): void => {
  emit("bg-color-change", color);
};

/**
 * 处理表格尺寸选择
 * @param {object} size - 表格尺寸 {rows: number, cols: number}
 */
const handleTableSizeSelected = (size: {
  rows: number;
  cols: number;
}): void => {
  emit("insert-table", size);
};

/**
 * 处理自定义表格请求
 */
const handleCustomTableRequested = (): void => {
  // 可以在这里添加自定义表格对话框逻辑
  emit("insert-table", { rows: 3, cols: 3 });
};
</script>

<script lang="ts">
export default {
  name: "EditorToolbar",
};
</script>

<style scoped>
/* 工具栏样式 */
.docly-toolbar {
  background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dadce0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  overflow-x: auto;
  padding: 8px 16px;
}

.toolbar-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
}

.toolbar-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 文件操作区域 */
.file-operations {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

/* 功能分类区域 */
.toolbar-category {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  min-width: 200px;
}

.font-category {
  border: 1px solid #dadce0;
  background: rgba(255, 255, 255, 0.8);
}

.layout-category {
  border-color: #34a853;
  background: rgba(52, 168, 83, 0.05);
}

/* 工具栏行 */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* 批注区域 */
.annotation-section {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.toolbar-btn.annotation-open {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1),
    rgba(147, 51, 234, 0.1)
  );
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.toolbar-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1),
    rgba(147, 51, 234, 0.1)
  );
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.toolbar-btn.active {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15),
    rgba(147, 51, 234, 0.15)
  );
  color: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.toolbar-btn svg {
  pointer-events: none;
}

.button-group {
  display: flex;
  border: 1px solid #404040;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.button-group .toolbar-btn {
  border: none;
  border-radius: 0;
  border-right: 1px solid #e1e5e9;
  background: #ffffff;
}

.button-group .toolbar-btn:last-child {
  border-right: none;
}

.button-group .toolbar-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1),
    rgba(147, 51, 234, 0.1)
  );
  border-color: transparent;
  color: #3b82f6;
  z-index: 1;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.button-group .toolbar-btn.active {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15),
    rgba(147, 51, 234, 0.15)
  );
  color: #3b82f6;
  border-color: transparent;
  z-index: 1;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
}

.compact-select {
  height: 32px;
  padding: 6px 24px 6px 8px;
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
  background-position: calc(100% - 6px) center;
  background-size: 12px 12px;
  min-width: 80px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.compact-select:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.compact-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
    0 2px 4px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

/* 颜色按钮样式 */
.color-picker-wrapper {
  position: relative;
}

.color-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.color-indicator {
  width: 12px;
  height: 2px;
  border-radius: 1px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.bg-indicator {
  border: 1px solid rgba(0, 0, 0, 0.3);
}

/* 暗色主题样式 */
.docly-toolbar.dark-theme {
  background: linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 100%);
  border-bottom-color: #404040;
}

.docly-toolbar.dark-theme .file-operations {
  background: rgba(45, 45, 45, 0.8);
  border-color: #404040;
}

.docly-toolbar.dark-theme .toolbar-category {
  background: rgba(45, 45, 45, 0.8);
  border-color: #404040;
}

.docly-toolbar.dark-theme .font-category {
  background: rgba(45, 45, 45, 0.8);
  border-color: #404040;
}

.docly-toolbar.dark-theme .layout-category {
  border-color: #34a853;
  background: rgba(52, 168, 83, 0.1);
}

.docly-toolbar.dark-theme .annotation-section {
  background: linear-gradient(to bottom, #2d2d2d 0%, #262626 100%);
  border-color: rgba(66, 133, 244, 0.2);
}

.docly-toolbar.dark-theme .toolbar-btn {
  background: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.docly-toolbar.dark-theme .toolbar-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(66, 133, 244, 0.15),
    rgba(147, 51, 234, 0.15)
  );
  border-color: #4285f4;
  color: #4285f4;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.15);
}

.docly-toolbar.dark-theme .toolbar-btn.active {
  background: linear-gradient(
    135deg,
    rgba(66, 133, 244, 0.25),
    rgba(147, 51, 234, 0.25)
  );
  color: #4285f4;
  border-color: #4285f4;
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.15);
}

.docly-toolbar.dark-theme .compact-select {
  background-color: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23e0e0e0' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
}

.docly-toolbar.dark-theme .compact-select:hover {
  border-color: #4285f4;
  background-color: #404040;
  box-shadow: 0 2px 4px rgba(66, 133, 244, 0.15);
  transform: translateY(-1px);
}

.docly-toolbar.dark-theme .compact-select:focus {
  border-color: #4285f4;
  background-color: #404040;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1),
    0 2px 4px rgba(66, 133, 244, 0.15);
  transform: translateY(-1px);
}

.docly-toolbar.dark-theme .compact-select option {
  background-color: #2d2d2d !important;
  color: #e0e0e0 !important;
}

.docly-toolbar.dark-theme .compact-select option:hover {
  background-color: #404040 !important;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .toolbar-container {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-left {
    flex-direction: column;
    gap: 12px;
  }

  .toolbar-category {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .docly-toolbar {
    padding: 6px 12px;
  }

  .toolbar-container {
    min-height: auto;
  }

  .toolbar-left {
    gap: 8px;
  }

  .file-operations,
  .toolbar-category,
  .annotation-section {
    padding: 6px 8px;
  }

  .toolbar-row {
    gap: 6px;
    min-height: 28px;
  }

  .toolbar-btn {
    width: 28px;
    height: 28px;
  }

  .compact-select {
    height: 28px;
    padding: 4px 20px 4px 6px;
    font-size: 12px;
    min-width: 70px;
  }
}

@media (max-width: 480px) {
  .docly-toolbar {
    padding: 4px 8px;
  }

  .toolbar-left {
    gap: 6px;
  }

  .file-operations,
  .toolbar-category,
  .annotation-section {
    padding: 4px 6px;
  }

  .toolbar-row {
    gap: 4px;
    min-height: 24px;
    flex-wrap: wrap;
  }

  .toolbar-section {
    gap: 2px;
  }

  .toolbar-btn {
    width: 24px;
    height: 24px;
  }

  .compact-select {
    height: 24px;
    padding: 2px 16px 2px 4px;
    font-size: 11px;
    min-width: 60px;
  }
}
</style>