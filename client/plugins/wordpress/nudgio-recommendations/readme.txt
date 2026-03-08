=== Nudgio Recommendations ===
Contributors: burarotechnologies
Tags: woocommerce, recommendations, cross-sell, upsell, product recommendations
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Display AI-powered product recommendations on your WooCommerce store — bestsellers, cross-sell, upsell, and similar products.

== Description ==

Nudgio Recommendations connects your WooCommerce store to the Nudgio recommendation engine to display personalized product recommendations on your storefront.

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

1. Upload the `nudgio-recommendations` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings → Nudgio Recommendations
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
* `style` — card, carousel, list (default: card)
* `device` — desktop, mobile (default: desktop)
* `product_id` — specific product ID (auto-detected on product pages)
* `primary_color` — hex color for buttons/accents
* `text_color` — hex color for text
* `bg_color` — hex color for background
* `border_radius` — CSS border-radius value
* `lookback_days` — order data lookback period (default: 30)
* `method` — bestseller method: volume, value, balanced (default: volume)
* `min_price_increase_percent` — upsell price threshold (default: 10)

= Do cross-sell/upsell/similar work on non-product pages? =

These types require a product context. On non-product pages, the shortcode outputs nothing unless you specify a `product_id` attribute explicitly.

== Changelog ==

= 1.0.0 =
* Initial release
* Shortcode with HMAC-signed iframe URLs
* Admin settings page with WP Settings API
* Test Connection functionality
* Auto-detection of WooCommerce product ID
* Encrypted API secret storage
* Auto-resizing iframes via postMessage

== Upgrade Notice ==

= 1.0.0 =
Initial release.
