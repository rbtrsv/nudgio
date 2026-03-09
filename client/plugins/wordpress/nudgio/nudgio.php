<?php
/**
 * Plugin Name: Nudgio Technologies
 * Plugin URI: https://www.nudgio.tech
 * Description: Display AI-powered product recommendations on your WooCommerce store using Nudgio's recommendation engine. Supports bestsellers, cross-sell, upsell, and similar products via simple shortcodes.
 * Version: 1.2.1
 * Requires at least: 6.1
 * Requires PHP: 8.0
 * Author: Buraro Technologies
 * Author URI: https://www.buraro.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: nudgio-technologies
 * WC requires at least: 7.0
 * WC tested up to: 9.0
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants
define( 'NUDGIO_VERSION', '1.2.1' );
define( 'NUDGIO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'NUDGIO_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// ==========================================
// Includes
// ==========================================

require_once NUDGIO_PLUGIN_DIR . 'includes/class-nudgio-shortcode.php';
require_once NUDGIO_PLUGIN_DIR . 'admin/class-nudgio-settings.php';

// ==========================================
// Plugin Activation
// ==========================================

/**
 * Set default options on activation.
 * Only sets defaults if options don't already exist (preserves existing config on reactivation).
 */
function nudgio_activate() {
    // Default settings — only set if not already configured
    if ( false === get_option( 'nudgio_server_url' ) ) {
        add_option( 'nudgio_server_url', 'https://server.nudgio.tech' );
    }
    if ( false === get_option( 'nudgio_default_type' ) ) {
        add_option( 'nudgio_default_type', 'bestsellers' );
    }
    if ( false === get_option( 'nudgio_default_count' ) ) {
        add_option( 'nudgio_default_count', '4' );
    }
    if ( false === get_option( 'nudgio_default_device' ) ) {
        add_option( 'nudgio_default_device', 'desktop' );
    }
    // Group 1: Widget Container
    if ( false === get_option( 'nudgio_default_widget_bg_color' ) ) {
        add_option( 'nudgio_default_widget_bg_color', '#FFFFFF' );
    }
    if ( false === get_option( 'nudgio_default_widget_padding' ) ) {
        add_option( 'nudgio_default_widget_padding', 'md' );
    }
    // Group 2: Widget Title
    if ( false === get_option( 'nudgio_default_widget_title' ) ) {
        add_option( 'nudgio_default_widget_title', '' );
    }
    if ( false === get_option( 'nudgio_default_title_color' ) ) {
        add_option( 'nudgio_default_title_color', '#111827' );
    }
    if ( false === get_option( 'nudgio_default_title_size' ) ) {
        add_option( 'nudgio_default_title_size', 'lg' );
    }
    if ( false === get_option( 'nudgio_default_title_alignment' ) ) {
        add_option( 'nudgio_default_title_alignment', 'left' );
    }
    // Group 3: Layout
    if ( false === get_option( 'nudgio_default_widget_style' ) ) {
        add_option( 'nudgio_default_widget_style', 'grid' );
    }
    if ( false === get_option( 'nudgio_default_widget_columns' ) ) {
        add_option( 'nudgio_default_widget_columns', '4' );
    }
    if ( false === get_option( 'nudgio_default_gap' ) ) {
        add_option( 'nudgio_default_gap', 'md' );
    }
    // Group 4: Product Card
    if ( false === get_option( 'nudgio_default_card_bg_color' ) ) {
        add_option( 'nudgio_default_card_bg_color', '#FFFFFF' );
    }
    if ( false === get_option( 'nudgio_default_card_border_radius' ) ) {
        add_option( 'nudgio_default_card_border_radius', '8px' );
    }
    if ( false === get_option( 'nudgio_default_card_border_width' ) ) {
        add_option( 'nudgio_default_card_border_width', '0' );
    }
    if ( false === get_option( 'nudgio_default_card_border_color' ) ) {
        add_option( 'nudgio_default_card_border_color', '#E5E7EB' );
    }
    if ( false === get_option( 'nudgio_default_card_shadow' ) ) {
        add_option( 'nudgio_default_card_shadow', 'md' );
    }
    if ( false === get_option( 'nudgio_default_card_padding' ) ) {
        add_option( 'nudgio_default_card_padding', 'md' );
    }
    if ( false === get_option( 'nudgio_default_card_hover' ) ) {
        add_option( 'nudgio_default_card_hover', 'lift' );
    }
    // Group 5: Product Image
    if ( false === get_option( 'nudgio_default_image_aspect' ) ) {
        add_option( 'nudgio_default_image_aspect', 'square' );
    }
    if ( false === get_option( 'nudgio_default_image_fit' ) ) {
        add_option( 'nudgio_default_image_fit', 'cover' );
    }
    if ( false === get_option( 'nudgio_default_image_radius' ) ) {
        add_option( 'nudgio_default_image_radius', '8px' );
    }
    // Group 6: Product Title in Card
    if ( false === get_option( 'nudgio_default_product_title_color' ) ) {
        add_option( 'nudgio_default_product_title_color', '#1F2937' );
    }
    if ( false === get_option( 'nudgio_default_product_title_size' ) ) {
        add_option( 'nudgio_default_product_title_size', 'sm' );
    }
    if ( false === get_option( 'nudgio_default_product_title_weight' ) ) {
        add_option( 'nudgio_default_product_title_weight', 'semibold' );
    }
    if ( false === get_option( 'nudgio_default_product_title_lines' ) ) {
        add_option( 'nudgio_default_product_title_lines', '2' );
    }
    if ( false === get_option( 'nudgio_default_product_title_alignment' ) ) {
        add_option( 'nudgio_default_product_title_alignment', 'left' );
    }
    // Group 7: Price
    if ( false === get_option( 'nudgio_default_show_price' ) ) {
        add_option( 'nudgio_default_show_price', true );
    }
    if ( false === get_option( 'nudgio_default_price_color' ) ) {
        add_option( 'nudgio_default_price_color', '#111827' );
    }
    if ( false === get_option( 'nudgio_default_price_size' ) ) {
        add_option( 'nudgio_default_price_size', 'md' );
    }
    // Group 8: CTA Button
    if ( false === get_option( 'nudgio_default_button_text' ) ) {
        add_option( 'nudgio_default_button_text', 'View' );
    }
    if ( false === get_option( 'nudgio_default_button_bg_color' ) ) {
        add_option( 'nudgio_default_button_bg_color', '#3B82F6' );
    }
    if ( false === get_option( 'nudgio_default_button_text_color' ) ) {
        add_option( 'nudgio_default_button_text_color', '#FFFFFF' );
    }
    if ( false === get_option( 'nudgio_default_button_radius' ) ) {
        add_option( 'nudgio_default_button_radius', '6px' );
    }
    if ( false === get_option( 'nudgio_default_button_size' ) ) {
        add_option( 'nudgio_default_button_size', 'md' );
    }
    if ( false === get_option( 'nudgio_default_button_variant' ) ) {
        add_option( 'nudgio_default_button_variant', 'solid' );
    }
    if ( false === get_option( 'nudgio_default_button_full_width' ) ) {
        add_option( 'nudgio_default_button_full_width', false );
    }
}
register_activation_hook( __FILE__, 'nudgio_activate' );

// ==========================================
// Initialize Plugin Components
// ==========================================

/**
 * Declare WooCommerce feature compatibility.
 * Our plugin only reads product IDs — it does not interact with orders,
 * cart, or checkout. Safe to declare compatible with all WC features.
 */
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
    }
} );

/**
 * Initialize the admin settings page.
 * Must run on plugins_loaded — admin_menu fires BEFORE admin_init,
 * so the menu registration inside the constructor needs to be hooked early enough.
 */
function nudgio_init_admin() {
    new Nudgio_Settings();
}
add_action( 'plugins_loaded', 'nudgio_init_admin' );

/**
 * Add settings link to the plugins list page.
 * Provides quick access from Plugins → Nudgio Technologies → Settings.
 */
function nudgio_settings_link( $links ) {
    $settings_link = '<a href="' . esc_url( admin_url( 'options-general.php?page=nudgio' ) ) . '">'
        . esc_html__( 'Settings', 'nudgio-technologies' ) . '</a>';
    array_unshift( $links, $settings_link );
    return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'nudgio_settings_link' );

/**
 * Register the [nudgio] shortcode.
 * Available on all pages — shortcode handler detects product context automatically.
 */
function nudgio_init_shortcode() {
    new Nudgio_Shortcode();
}
add_action( 'init', 'nudgio_init_shortcode' );

// ==========================================
// Gutenberg Block Registration
// ==========================================

/**
 * Register the nudgio/recommendations Gutenberg block.
 *
 * Uses block.json metadata (apiVersion 3) with server-side rendering via render.php.
 * render.php delegates to Nudgio_Shortcode::render_shortcode() — zero duplication.
 * Requires WordPress 6.1+ for render file support in block.json.
 */
function nudgio_register_block() {
    register_block_type( NUDGIO_PLUGIN_DIR . 'blocks/recommendations' );
}
add_action( 'init', 'nudgio_register_block' );
