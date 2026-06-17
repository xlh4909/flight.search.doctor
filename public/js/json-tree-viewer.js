/**
 * JsonTreeViewer - vanilla JS JSON tree viewer component.
 * Usage: var tv = new JsonTreeViewer(document.getElementById('container'), jsonData);
 *        tv.filter('price');   // highlight keys containing "price"
 *        tv.destroy();          // clean up
 *
 * No dependencies. Works in any browser.
 */
(function () {
  'use strict';

  var STYLE_ID = 'jtv-styles';
  var CLASS_NODE = 'jtv-node';
  var CLASS_LINE = 'jtv-line';
  var CLASS_TOGGLE = 'jtv-toggle';
  var CLASS_KEY = 'jtv-key';
  var CLASS_VALUE = 'jtv-value';
  var CLASS_CHILDREN = 'jtv-children';
  var CLASS_TYPE = 'jtv-type';
  var CLASS_HIGHLIGHT = 'jtv-highlight';
  var COLLAPSED_CLASS = 'jtv-collapsed';
  var EXPANDED_CHAR = '\u25BC';   // ▼
  var COLLAPSED_CHAR = '\u25B6';  // ▶
  var INDENT_PX = 20;

  // ── CSS injection (once per page) ──────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.' + CLASS_NODE + ' { font-family: "SF Mono", Monaco, Menlo, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; line-height: 1.65; }',
      '.' + CLASS_LINE + ' { display: flex; align-items: baseline; white-space: nowrap; min-height: 20px; }',
      '.' + CLASS_LINE + ':hover { background: rgba(0,0,0,0.03); border-radius: 2px; }',
      '.' + CLASS_TOGGLE + ' { cursor: pointer; user-select: none; flex-shrink: 0; width: 14px; text-align: center; color: #888; margin-right: 2px; }',
      '.' + CLASS_TOGGLE + ':hover { color: #333; }',
      '.' + CLASS_TOGGLE + '.jtv-noop { cursor: default; visibility: hidden; }',
      '.' + CLASS_KEY + ' { color: #881391; }',
      '.' + CLASS_VALUE + ' { color: #1a1aa6; }',
      '.' + CLASS_VALUE + '.jtv-value-string { color: #c41a16; }',
      '.' + CLASS_VALUE + '.jtv-value-boolean { color: #1a1aa6; }',
      '.' + CLASS_VALUE + '.jtv-value-null { color: #999; }',
      '.' + CLASS_VALUE + '.jtv-value-number { color: #1a1aa6; }',
      '.' + CLASS_CHILDREN + ' { }',
      '.' + CLASS_CHILDREN + '.' + COLLAPSED_CLASS + ' { display: none; }',
      '.' + CLASS_TYPE + ' { color: #aaa; font-size: 11px; margin-left: 6px; font-style: italic; }',
      '.' + CLASS_HIGHLIGHT + ' > .' + CLASS_LINE + ' .' + CLASS_KEY + ' { background-color: #fff176; border-radius: 2px; padding: 0 2px; margin: 0 -2px; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function isObject(val) {
    return val !== null && typeof val === 'object';
  }

  function isArray(val) {
    return Array.isArray(val);
  }

  function getType(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Build a visible preview string for a collapsed value.
   */
  function collapsePreview(val) {
    var t = getType(val);
    if (t === 'array') {
      return '[' + val.length + ']';
    }
    if (t === 'object') {
      var keys = Object.keys(val);
      // Object could be huge; show first few keys as hint
      if (keys.length <= 3) {
        return '{' + keys.map(function (k) { return '"' + escapeHtml(k) + '"'; }).join(', ') + '}';
      }
      return '{' + keys.slice(0, 3).map(function (k) { return '"' + escapeHtml(k) + '"'; }).join(', ') + ', ...}';
    }
    return formatPrimitive(val);
  }

  /**
   * Format a primitive value for display.
   * Strings get quotes, numbers/booleans/null are shown as-is.
   */
  function formatPrimitive(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    var t = typeof val;
    if (t === 'string') return '"' + escapeHtml(val) + '"';
    if (t === 'number') return String(val);
    if (t === 'boolean') return String(val);
    return String(val);
  }

  /**
   * Format the key portion: "key" for object keys, index for arrays, empty for root.
   */
  function formatKey(key) {
    if (key === null || key === undefined || key === '') return '';
    // If key is numeric index from array, show as [index]
    if (typeof key === 'number' || /^\d+$/.test(String(key))) {
      return '[' + key + ']';
    }
    return '"' + escapeHtml(String(key)) + '"';
  }

  function getCollapseType(val) {
    var t = getType(val);
    if (t === 'array') return 'array';
    if (t === 'object') return 'object';
    return null;
  }

  // ── Constructor ────────────────────────────────────────────────────────────
  function JsonTreeViewer(container, data) {
    if (!container) throw new Error('JsonTreeViewer: container element is required');
    this.container = container;
    this.data = data;
    /** @type {{ el: HTMLElement, key: string }[]} */
    this.nodes = [];
    injectStyles();
    this._render();
  }

  // ── Prototype ──────────────────────────────────────────────────────────────

  /**
   * Full re-render of the tree from this.data.
   */
  JsonTreeViewer.prototype._render = function () {
    var self = this;
    self.container.innerHTML = '';
    self.nodes = [];
    self._buildTree(self.container, self.data, '', 0);
  };

  /**
   * Recursively build a subtree under `parentEl`.
   *
   * @param {HTMLElement} parentEl    - where to append nodes
   * @param {*}           val         - the JSON value
   * @param {string}      key         - key name (empty for root, string for object keys, number string for array indices)
   * @param {number}      level       - nesting depth (controls padding)
   */
  JsonTreeViewer.prototype._buildTree = function (parentEl, val, key, level) {
    var self = this;
    var collapseType = getCollapseType(val);
    var isExpandable = collapseType !== null;
    var hasKey = key !== null && key !== undefined && key !== '';

    // ── Create elements ──
    var nodeDiv = document.createElement('div');
    nodeDiv.className = CLASS_NODE;
    nodeDiv.setAttribute('data-jtv-level', level);
    // Left padding for indentation
    nodeDiv.style.paddingLeft = (level * INDENT_PX) + 'px';
    // Store subtree data for click-to-copy
    nodeDiv._jtvSubtreeData = val;
    parentEl.appendChild(nodeDiv);

    // Register node for filter — track both key and value text
    var valText = '';
    if (!isExpandable && val !== null && val !== undefined) {
        valText = String(val).toLowerCase();
    }
    self.nodes.push({ el: nodeDiv, key: key, valText: valText });

    var lineDiv = document.createElement('div');
    lineDiv.className = CLASS_LINE;
    nodeDiv.appendChild(lineDiv);

    // Toggle
    var toggleSpan = document.createElement('span');
    toggleSpan.className = CLASS_TOGGLE;
    if (isExpandable) {
      toggleSpan.textContent = EXPANDED_CHAR;
      toggleSpan.addEventListener('click', function (e) {
        e.stopPropagation();
        self._toggle(nodeDiv, toggleSpan, collapseType, val, key, hasKey);
      });
    } else {
      toggleSpan.textContent = '\u00A0'; // non-breaking space to preserve layout
      toggleSpan.classList.add('jtv-noop');
    }
    lineDiv.appendChild(toggleSpan);

    lineDiv.addEventListener('click', function(e) {
      if (e.target === toggleSpan || e.target.closest('.' + CLASS_TOGGLE)) return;
      e.stopPropagation();
      var subtree = nodeDiv._jtvSubtreeData;
      var text = subtree === undefined ? '' : JSON.stringify(subtree, null, 2);
      copyToClipboard(text);
    });

    // Key
    if (hasKey) {
      var keySpan = document.createElement('span');
      keySpan.className = CLASS_KEY;
      keySpan.textContent = formatKey(key);
      lineDiv.appendChild(keySpan);

      // Colon separator
      var colonSpan = document.createElement('span');
      colonSpan.textContent = ': ';
      lineDiv.appendChild(colonSpan);
    }

    // Value preview
    if (isExpandable) {
      // Expandable: show preview in a value span
      var previewSpan = document.createElement('span');
      previewSpan.className = CLASS_VALUE + ' jtv-collapsed-preview';
      previewSpan.textContent = collapsePreview(val);
      lineDiv.appendChild(previewSpan);

      // Type badge
      var typeSpan = document.createElement('span');
      typeSpan.className = CLASS_TYPE;
      if (collapseType === 'object') {
        var keyCount = Object.keys(val).length;
        typeSpan.textContent = keyCount === 0 ? '{}' : (keyCount + ' key' + (keyCount !== 1 ? 's' : ''));
      } else {
        typeSpan.textContent = val.length === 0 ? '[]' : (val.length + ' item' + (val.length !== 1 ? 's' : ''));
      }
      lineDiv.appendChild(typeSpan);

      // Children container (initially visible - all nodes default expanded)
      var childrenDiv = document.createElement('div');
      childrenDiv.className = CLASS_CHILDREN;
      // Store reference for toggle
      nodeDiv._jtvChildren = childrenDiv;
      nodeDiv._jtvTypeSpan = typeSpan;
      nodeDiv._jtvPreviewSpan = previewSpan;
      nodeDiv._jtvValue = val;
      nodeDiv._jtvKey = key;
      nodeDiv._jtvHasKey = hasKey;
      nodeDiv._jtvCollapseType = collapseType;
      nodeDiv.appendChild(childrenDiv);

      // Recurse
      if (collapseType === 'object') {
        var keys = Object.keys(val);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          self._buildTree(childrenDiv, val[k], k, level + 1);
        }
      } else {
        // Array
        for (var j = 0; j < val.length; j++) {
          self._buildTree(childrenDiv, val[j], j, level + 1);
        }
      }
    } else {
      // Primitive: show formatted value
      var valueSpan = document.createElement('span');
      valueSpan.className = CLASS_VALUE;
      valueSpan.textContent = formatPrimitive(val);
      // Add type-specific class for coloring
      var t = getType(val);
      if (t === 'string') {
        valueSpan.classList.add('jtv-value-string');
      } else if (t === 'boolean') {
        valueSpan.classList.add('jtv-value-boolean');
      } else if (t === 'null') {
        valueSpan.classList.add('jtv-value-null');
      } else if (t === 'number') {
        valueSpan.classList.add('jtv-value-number');
      }
      lineDiv.appendChild(valueSpan);
    }
  };

  /**
   * Toggle expand/collapse of a node.
   */
  JsonTreeViewer.prototype._toggle = function (nodeDiv, toggleSpan, collapseType, val, key, hasKey) {
    var childrenDiv = nodeDiv._jtvChildren;
    var typeSpan = nodeDiv._jtvTypeSpan;
    var previewSpan = nodeDiv._jtvPreviewSpan;

    var isCurrentlyExpanded = !childrenDiv.classList.contains(COLLAPSED_CLASS);

    if (isCurrentlyExpanded) {
      // Collapse
      childrenDiv.classList.add(COLLAPSED_CLASS);
      toggleSpan.textContent = COLLAPSED_CHAR;
    } else {
      // Expand
      childrenDiv.classList.remove(COLLAPSED_CLASS);
      toggleSpan.textContent = EXPANDED_CHAR;
    }
  };

  /**
   * filter(keyword) - highlight nodes whose key contains the keyword.
   * Case-insensitive. Empty string clears all highlights.
   */
  JsonTreeViewer.prototype.filter = function (keyword) {
    var lowerKeyword = (keyword || '').toLowerCase();
    for (var i = 0; i < this.nodes.length; i++) {
      var node = this.nodes[i];
      var nodeKey = String(node.key).toLowerCase();
      var nodeVal = node.valText || '';
      var shouldHighlight = lowerKeyword.length > 0 && (nodeKey === lowerKeyword || nodeVal.indexOf(lowerKeyword) !== -1);
      if (shouldHighlight) {
        node.el.classList.add(CLASS_HIGHLIGHT);
      } else {
        node.el.classList.remove(CLASS_HIGHLIGHT);
      }
    }
    if (lowerKeyword.length > 0) {
      var firstMatch = this.container.querySelector('.' + CLASS_HIGHLIGHT);
      if (firstMatch) firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /**
   * destroy() - remove all content from the container and clean up.
   */
  JsonTreeViewer.prototype.destroy = function () {
    this.container.innerHTML = '';
    this.nodes = [];
    this.data = null;
  };

  function copyToClipboard(text) {
    try {
      navigator.clipboard.writeText(text).then(function() {
        showToast();
      });
    } catch(e) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast();
    }
  }

  function showToast() {
    var el = document.getElementById('jtv-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'jtv-toast';
      el.textContent = '\u5df2\u590d\u5236!';
      el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 20px;border-radius:6px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.2s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.style.opacity = '1';
    clearTimeout(el._jtvTimeout);
    el._jtvTimeout = setTimeout(function() { el.style.opacity = '0'; }, 1500);
  }

  window.JsonTreeViewer = JsonTreeViewer;
})();
