/**
 * Nudgio Widget Loader — Universal JS snippet for storefront widget embedding.
 *
 * Usage:
 *   <div class="nudgio-widget"
 *        data-key-id="5"
 *        data-type="bestsellers"
 *        data-top="4"
 *        data-style="card">
 *   </div>
 *   <script src="https://server.nudgio.tech/static/widget.js" async defer></script>
 *
 * How it works:
 *   1. Auto-detects server URL from the script's src attribute
 *   2. Finds all .nudgio-widget divs on the page
 *   3. Reads data-* attributes → builds sign endpoint query string
 *   4. XHR GET → /ecommerce/widget/sign?key_id=5&type=bestsellers&...
 *   5. Creates <iframe src="{signed_url}"> inside the div
 *   6. Listens for postMessage("nudgio-resize") → auto-resizes iframe height
 *   7. MutationObserver watches for dynamically added widgets
 *
 * No dependencies. Uses XMLHttpRequest for maximum browser compatibility.
 */
(function () {
  'use strict';

  // Prevent double-initialization
  if (window.__nudgioWidgetLoaded) return;
  window.__nudgioWidgetLoaded = true;

  // Auto-detect server URL from the script's src attribute
  var scripts = document.getElementsByTagName('script');
  var serverUrl = '';
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    if (src.indexOf('/ecommerce/static/widget.js') !== -1) {
      // Extract base URL: "https://server.nudgio.tech/ecommerce/static/widget.js" → "https://server.nudgio.tech"
      serverUrl = src.replace('/ecommerce/static/widget.js', '');
      break;
    }
  }

  if (!serverUrl) {
    console.error('[Nudgio] Could not detect server URL from script src');
    return;
  }

  // Sign endpoint path
  var signPath = '/ecommerce/widget/sign';

  // Default values — only send non-default params to minimize URL length
  var DEFAULTS = {
    top: '4',
    style: 'card',
    columns: '4',
    size: 'default',
    'primary-color': '#3B82F6',
    'text-color': '#1F2937',
    'bg-color': '#FFFFFF',
    'border-radius': '8px',
    'cta-text': 'View',
    'show-price': 'true',
    'image-aspect': 'square',
    'lookback-days': '30',
    method: 'volume',
    'min-price-increase': '10'
  };

  // Map data-attribute names (kebab-case) to query param names (snake_case)
  var ATTR_MAP = {
    'key-id': 'key_id',
    'type': 'type',
    'product-id': 'product_id',
    'top': 'top',
    'style': 'style',
    'columns': 'columns',
    'size': 'size',
    'primary-color': 'primary_color',
    'text-color': 'text_color',
    'bg-color': 'bg_color',
    'border-radius': 'border_radius',
    'widget-title': 'widget_title',
    'cta-text': 'cta_text',
    'show-price': 'show_price',
    'image-aspect': 'image_aspect',
    'lookback-days': 'lookback_days',
    'method': 'method',
    'min-price-increase': 'min_price_increase'
  };

  /**
   * Initialize a single .nudgio-widget div
   */
  function initWidget(div) {
    // Skip already initialized widgets
    if (div.getAttribute('data-nudgio-init') === 'true') return;
    div.setAttribute('data-nudgio-init', 'true');

    // Read data-key-id (required)
    var keyId = div.getAttribute('data-key-id');
    var widgetType = div.getAttribute('data-type');
    if (!keyId || !widgetType) {
      console.error('[Nudgio] Widget missing required data-key-id or data-type');
      return;
    }

    // Build query params from data attributes
    var params = [];
    for (var attr in ATTR_MAP) {
      var value = div.getAttribute('data-' + attr);
      if (value !== null && value !== undefined) {
        params.push(encodeURIComponent(ATTR_MAP[attr]) + '=' + encodeURIComponent(value));
      }
    }

    var signUrl = serverUrl + signPath + '?' + params.join('&');

    // Show loading state
    div.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading recommendations...</div>';

    // XHR GET to sign endpoint
    var xhr = new XMLHttpRequest();
    xhr.open('GET', signUrl, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      if (xhr.status === 200) {
        try {
          var response = JSON.parse(xhr.responseText);
          if (response.url) {
            createIframe(div, response.url);
          } else {
            div.innerHTML = '<div style="text-align:center;padding:20px;color:#c00;">Widget error: no URL returned</div>';
          }
        } catch (e) {
          div.innerHTML = '<div style="text-align:center;padding:20px;color:#c00;">Widget error: invalid response</div>';
        }
      } else if (xhr.status === 429) {
        div.innerHTML = '<div style="text-align:center;padding:20px;color:#c00;">Rate limit exceeded. Please try again later.</div>';
      } else {
        div.innerHTML = '<div style="text-align:center;padding:20px;color:#c00;">Widget error: ' + xhr.status + '</div>';
      }
    };
    xhr.send();
  }

  /**
   * Create iframe inside widget div with auto-resize support
   */
  function createIframe(div, url) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.minHeight = '200px';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');

    // Replace loading state with iframe
    div.innerHTML = '';
    div.appendChild(iframe);
  }

  /**
   * Global message listener for iframe auto-resize
   * Widget HTML inside iframe sends postMessage({ type: "nudgio-resize", height: N })
   */
  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'nudgio-resize') return;

    var height = event.data.height;
    if (!height || height < 50) return;

    // Find the iframe that sent this message
    var iframes = document.querySelectorAll('.nudgio-widget iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        iframes[i].style.height = height + 'px';
        break;
      }
    }
  });

  /**
   * Initialize all existing .nudgio-widget divs on the page
   */
  function initAll() {
    var widgets = document.querySelectorAll('.nudgio-widget');
    for (var i = 0; i < widgets.length; i++) {
      initWidget(widgets[i]);
    }
  }

  /**
   * MutationObserver for dynamically added widgets (SPA support)
   */
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;  // Element nodes only

          // Check if the added node itself is a widget
          if (node.classList && node.classList.contains('nudgio-widget')) {
            initWidget(node);
          }

          // Check children of added node
          if (node.querySelectorAll) {
            var children = node.querySelectorAll('.nudgio-widget');
            for (var k = 0; k < children.length; k++) {
              initWidget(children[k]);
            }
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Initialize on DOM ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
