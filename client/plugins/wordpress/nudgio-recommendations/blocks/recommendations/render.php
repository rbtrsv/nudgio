<?php
/**
 * Nudgio Recommendations — Gutenberg Block Frontend Render
 *
 * Called by WordPress when displaying the block on the frontend.
 * Maps block attributes to shortcode-compatible array and delegates
 * to Nudgio_Shortcode::render_shortcode() — reuses ALL existing logic:
 * credential decryption, HMAC signing, product auto-detection, guards, iframe + auto-resize JS.
 *
 * @var array    $attributes Block attributes (from block.json defaults + editor).
 * @var string   $content    Inner block content (empty for this block).
 * @var WP_Block $block      Block instance.
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Map block attributes to shortcode-compatible array
$atts = array(
    'type'                       => $attributes['type'],
    'count'                      => $attributes['count'],
    'style'                      => $attributes['style'],
    'device'                     => $attributes['device'],
    'product_id'                 => $attributes['product_id'],
    'primary_color'              => $attributes['primary_color'],
    'text_color'                 => $attributes['text_color'],
    'bg_color'                   => $attributes['bg_color'],
    'border_radius'              => $attributes['border_radius'],
    'lookback_days'              => $attributes['lookback_days'],
    'method'                     => $attributes['method'],
    'min_price_increase_percent' => $attributes['min_price_increase_percent'],
);

// Render using the existing shortcode pipeline
$output = Nudgio_Shortcode::render_shortcode( $atts );

// Product-dependent types on non-product pages — show friendly message in block wrapper
$product_required_types = array( 'cross-sell', 'upsell', 'similar' );
if ( empty( $output ) && in_array( $attributes['type'], $product_required_types, true ) ) {
    $output = '<p style="padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;color:#6b7280;font-size:14px;text-align:center;">'
        . esc_html__( 'This widget requires a product page. Add it to a WooCommerce product page or specify a Product ID in the block settings.', 'nudgio-recommendations' )
        . '</p>';
}

// Wrap in block wrapper div (adds alignment classes from supports.align)
if ( ! empty( $output ) ) {
    echo '<div ' . get_block_wrapper_attributes() . '>' . $output . '</div>';
}
