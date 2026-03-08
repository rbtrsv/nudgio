<?php
/**
 * Nudgio Technologies — Uninstall
 *
 * Cleanup on plugin deletion (not deactivation).
 * Removes all nudgio_* options from wp_options.
 *
 * This file is called by WordPress when the plugin is deleted via the admin UI.
 * It is NOT called on deactivation — only on full deletion.
 */

// Prevent direct access — must be called by WordPress uninstall process
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Remove all nudgio_* options from wp_options
$nudgio_options = array(
    'nudgio_key_id',
    'nudgio_api_secret',
    'nudgio_server_url',
    'nudgio_default_type',
    'nudgio_default_count',
    'nudgio_default_style',
    'nudgio_default_device',
    'nudgio_default_primary_color',
    'nudgio_default_text_color',
    'nudgio_default_bg_color',
    'nudgio_default_border_radius',
);

foreach ( $nudgio_options as $nudgio_option ) {
    delete_option( $nudgio_option );
}
