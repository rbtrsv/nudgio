=== Nudgio Technologies ===
Contributors: burarotechnologies
Tags: woocommerce, recommendations, cross-sell, upsell, product recommendations
Requires at least: 6.1
Tested up to: 6.9
Requires PHP: 8.0
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Display AI-powered product recommendations on your WooCommerce store — bestsellers, cross-sell, upsell, and similar products.

== Description ==

Nudgio Technologies connects your WooCommerce store to the Nudgio recommendation engine to display personalized product recommendations on your storefront.

**Features:**

* Bestseller recommendations based on real order data
* Cross-sell recommendations ("frequently bought together")
* Upsell recommendations (higher-priced alternatives)
* Similar product recommendations
* Simple `[nudgio]` shortcode with customizable attributes
* Auto-detects WooCommerce product ID on product pages
* HMAC-signed URLs — your API secret never appears in page source
* Configurable widget appearance (colors, style, layout)
* Iframe-based rendering — no CSS conflicts with your theme
* Auto-resizing iframes — content height adjusts automatically

**Requirements:**

* A Nudgio account with an active connection ([nudgio.tech](https://www.nudgio.tech))
* An API key generated from your Nudgio dashboard (Connection → API Keys tab)
* WooCommerce 7.0 or later
* PHP 8.0 or later

== Installation ==

1. Upload the `nudgio` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings → Nudgio Technologies
4. Enter your Key ID and API Secret from the Nudgio dashboard
5. Click "Test Connection" to verify
6. Add `[nudgio]` shortcodes to your pages or posts

== Frequently Asked Questions ==

= How do I get an API key? =

1. Sign up at [nudgio.tech](https://www.nudgio.tech)
2. Create a WooCommerce connection
3. Go to the connection's "API Keys" tab
4. Click "Generate Key" — save the secret immediately (shown once)

= Is my API secret secure? =

Yes. The API secret is encrypted before storage in WordPress. It never appears in your page source — only the Key ID, timestamp, nonce, and HMAC signature are included in widget URLs.

= What shortcode attributes are available? =

* `type` — bestsellers, cross-sell, upsell, similar (default: bestsellers)
* `count` — number of products to show (default: 4)
* `style` — card, carousel (default: card)
* `columns` — max columns at full width, 2-6 (default: 4)
* `size` — compact, default, spacious (default: default)
* `product_id` — specific product ID (auto-detected on product pages)
* `primary_color` — hex color for buttons/accents
* `text_color` — hex color for text
* `bg_color` — hex color for background
* `border_radius` — CSS border-radius value (default: 8px)
* `widget_title` — custom widget heading (leave empty for auto-default)
* `cta_text` — button text, e.g. View, Shop Now (default: View)
* `show_price` — show product price: true/false (default: true)
* `image_aspect` — square, portrait, landscape (default: square)
* `lookback_days` — order data lookback period (default: 30)
* `method` — bestseller method: volume, value, balanced (default: volume)
* `min_price_increase_percent` — upsell price threshold (default: 10)

= Do cross-sell/upsell/similar work on non-product pages? =

These types require a product context. On non-product pages, the shortcode outputs nothing unless you specify a `product_id` attribute explicitly.

== Changelog ==

= 1.1.0 =
* Added Gutenberg block with full visual editor controls (Widget Title, Button Text, Show Price, Image Aspect Ratio)
* Added responsive columns setting (2-6, responsive cascade: 1 col mobile, 2 col tablet, N col desktop)
* Added size setting (compact, default, spacious) for density control
* Added widget_title, cta_text, show_price, image_aspect shortcode attributes
* Fixed render.php block-to-shortcode mapping for all visual fields
* Updated shortcode to pass all visual parameters through HMAC-signed URLs

= 1.0.0 =
* Initial release
* Shortcode with HMAC-signed iframe URLs
* Admin settings page with WP Settings API
* Test Connection functionality
* Auto-detection of WooCommerce product ID
* Encrypted API secret storage
* Auto-resizing iframes via postMessage

== Upgrade Notice ==

= 1.1.0 =
Gutenberg block with full visual controls. New shortcode attributes: columns, size, widget_title, cta_text, show_price, image_aspect.

= 1.0.0 =
Initial release.
