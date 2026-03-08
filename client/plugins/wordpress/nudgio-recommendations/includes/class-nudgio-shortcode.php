<?php
/**
 * Nudgio Shortcode — [nudgio]
 *
 * Generates HMAC-signed iframe URLs for displaying Nudgio recommendation widgets.
 * The API secret never appears in the HTML output — only key_id, ts, nonce, sig, and widget params.
 *
 * Signed URL format:
 *   /ecommerce/widget/{type}?key_id=5&ts=1709913600&nonce=a1b2c3&top=4&style=card&sig=<HMAC>
 *
 * Signature covers ALL query params (not just auth params) — prevents tampering.
 * Same pattern as Shopify Theme App Extension (iframe + auto-resize JS).
 *
 * Auto-detects WooCommerce product ID on product pages for cross-sell/upsell/similar.
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Nudgio_Shortcode {

    // ==========================================
    // Constructor — Register Shortcode
    // ==========================================

    public function __construct() {
        add_shortcode( 'nudgio', array( __CLASS__, 'render_shortcode' ) );
    }

    // ==========================================
    // Shortcode Handler
    // ==========================================

    /**
     * Render the [nudgio] shortcode.
     *
     * This function:
     * 1. Merge shortcode attributes with defaults from wp_options
     * 2. Read and decrypt API credentials from wp_options
     * 3. Auto-detect WooCommerce product ID on product pages (if applicable)
     * 4. Guard: product-dependent types on non-product pages output nothing
     * 5. Build params array with ALL widget params + key_id + ts + nonce
     * 6. Sort alphabetically → canonical query → HMAC-SHA256 → append sig
     * 7. Output iframe with signed URL + auto-resize JS
     *
     * @param array|string $atts Shortcode attributes.
     * @return string HTML output (iframe + resize script).
     */
    public static function render_shortcode( $atts ) {
        // Step 1: Merge attributes with defaults from wp_options
        $atts = shortcode_atts(
            array(
                'type'                       => get_option( 'nudgio_default_type', 'bestsellers' ),
                'count'                      => get_option( 'nudgio_default_count', 4 ),
                'style'                      => get_option( 'nudgio_default_style', 'card' ),
                'device'                     => get_option( 'nudgio_default_device', 'desktop' ),
                'product_id'                 => '',
                'primary_color'              => get_option( 'nudgio_default_primary_color', '#3B82F6' ),
                'text_color'                 => get_option( 'nudgio_default_text_color', '#1F2937' ),
                'bg_color'                   => get_option( 'nudgio_default_bg_color', '#FFFFFF' ),
                'border_radius'              => get_option( 'nudgio_default_border_radius', '8px' ),
                'lookback_days'              => '30',
                'method'                     => 'volume',
                'min_price_increase_percent' => '10',
            ),
            $atts,
            'nudgio'
        );

        // Step 2: Read and decrypt API credentials
        $key_id     = absint( get_option( 'nudgio_key_id', 0 ) );
        $encrypted  = get_option( 'nudgio_api_secret', '' );
        $server_url = esc_url_raw( get_option( 'nudgio_server_url', 'https://server.nudgio.tech' ) );

        // No credentials configured — output nothing (don't show broken iframe)
        if ( ! $key_id || empty( $encrypted ) ) {
            return '';
        }

        // Decrypt the stored secret
        $secret = Nudgio_Settings::decrypt_secret( $encrypted );
        if ( false === $secret ) {
            return '';
        }

        // Sanitize type to allowed values
        $type = sanitize_text_field( $atts['type'] );
        $allowed_types = array( 'bestsellers', 'cross-sell', 'upsell', 'similar' );
        if ( ! in_array( $type, $allowed_types, true ) ) {
            $type = 'bestsellers';
        }

        // Step 3: Auto-detect WooCommerce product ID on product pages
        $product_id = sanitize_text_field( $atts['product_id'] );
        if ( empty( $product_id ) && function_exists( 'wc_get_product' ) ) {
            global $product;
            if ( $product instanceof WC_Product ) {
                $product_id = (string) $product->get_id();
            }
        }

        // Step 4: Guard — product-dependent types on non-product pages output nothing
        $product_required_types = array( 'cross-sell', 'upsell', 'similar' );
        if ( in_array( $type, $product_required_types, true ) && empty( $product_id ) ) {
            return '';
        }

        // Step 5: Build params array with ALL widget params + auth params
        $params = array(
            'key_id'        => $key_id,
            'ts'            => time(),
            'nonce'         => bin2hex( random_bytes( 8 ) ),
            'top'           => absint( $atts['count'] ),
            'style'         => sanitize_text_field( $atts['style'] ),
            'device'        => sanitize_text_field( $atts['device'] ),
            'primary_color' => sanitize_hex_color( $atts['primary_color'] ),
            'text_color'    => sanitize_hex_color( $atts['text_color'] ),
            'bg_color'      => sanitize_hex_color( $atts['bg_color'] ),
            'border_radius' => sanitize_text_field( $atts['border_radius'] ),
        );

        // Add type-specific params
        if ( 'bestsellers' === $type ) {
            $params['lookback_days'] = absint( $atts['lookback_days'] );
            $params['method']        = sanitize_text_field( $atts['method'] );
        } elseif ( 'cross-sell' === $type ) {
            $params['product_id']    = $product_id;
            $params['lookback_days'] = absint( $atts['lookback_days'] );
        } elseif ( 'upsell' === $type ) {
            $params['product_id']                 = $product_id;
            $params['min_price_increase_percent']  = absint( $atts['min_price_increase_percent'] );
        } elseif ( 'similar' === $type ) {
            $params['product_id'] = $product_id;
        }

        // Step 6: Sort alphabetically → canonical query → HMAC-SHA256 → append sig
        ksort( $params );
        $canonical    = http_build_query( $params );
        $params['sig'] = hash_hmac( 'sha256', $canonical, $secret );

        // Build the full signed URL
        $url = trailingslashit( $server_url ) . 'ecommerce/widget/' . $type . '?' . http_build_query( $params );

        // Step 7: Output iframe with signed URL + auto-resize JS
        // Unique frame ID per shortcode instance (for resize targeting)
        $frame_id = 'nudgio-frame-' . wp_rand( 100000, 999999 );

        $output  = '<iframe';
        $output .= ' id="' . esc_attr( $frame_id ) . '"';
        $output .= ' src="' . esc_url( $url ) . '"';
        $output .= ' style="width:100%;border:none;overflow:hidden;min-height:200px;"';
        $output .= ' loading="lazy"';
        $output .= ' title="' . esc_attr__( 'Nudgio Product Recommendations', 'nudgio-recommendations' ) . '"';
        $output .= '></iframe>';

        // Auto-resize JS — listens for postMessage from iframe content
        $output .= '<script type="text/javascript">';
        $output .= '(function(){';
        $output .= 'var frameId="' . esc_js( $frame_id ) . '";';
        $output .= 'window.addEventListener("message",function(e){';
        $output .= 'if(e.data&&e.data.type==="nudgio-resize"){';
        $output .= 'var el=document.getElementById(frameId);';
        $output .= 'if(el){el.style.height=e.data.height+"px";}';
        $output .= '}';
        $output .= '});';
        $output .= '})();';
        $output .= '</script>';

        return $output;
    }
}
