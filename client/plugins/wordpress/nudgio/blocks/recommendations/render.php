<?php
/**
 * Nudgio Technologies — Gutenberg Block Frontend Render
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
$nudgio_atts = array(
    'type'                       => $attributes['type'],
    'count'                      => $attributes['count'],
    'style'                      => $attributes['style'],
    'columns'                    => $attributes['columns'],
    'size'                       => $attributes['size'],
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
$nudgio_output = Nudgio_Shortcode::render_shortcode( $nudgio_atts );

// Product-dependent types on non-product pages — show friendly message in block wrapper
$nudgio_product_required_types = array( 'cross-sell', 'upsell', 'similar' );
if ( empty( $nudgio_output ) && in_array( $attributes['type'], $nudgio_product_required_types, true ) ) {
    $nudgio_output = '<p style="padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;color:#6b7280;font-size:14px;text-align:center;">'
        . esc_html__( 'This widget requires a product page. Add it to a WooCommerce product page or specify a Product ID in the block settings.', 'nudgio-technologies' )
        . '</p>';
}

// Wrap in block wrapper div (adds alignment classes from supports.align)
if ( ! empty( $nudgio_output ) ) {
    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns sanitized HTML attributes, $nudgio_output is pre-escaped by Nudgio_Shortcode::render_shortcode()
    echo '<div ' . get_block_wrapper_attributes() . '>' . $nudgio_output . '</div>';
}
