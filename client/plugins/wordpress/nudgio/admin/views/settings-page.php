<?php
/**
 * Nudgio Settings Page Template
 *
 * Rendered by Nudgio_Settings::render_settings_page().
 * Uses WordPress Settings API sections + fields, plus a "Test Connection" button.
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap">
    <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

    <form method="post" action="options.php">
        <?php
        // Output nonce, action, and option_page fields for the settings page
        settings_fields( 'nudgio_settings' );

        // Output all settings sections and their fields
        do_settings_sections( 'nudgio' );

        // Submit button
        submit_button( __( 'Save Settings', 'nudgio' ) );
        ?>
    </form>

    <hr />

    <!-- Test Connection -->
    <h2><?php esc_html_e( 'Test Connection', 'nudgio' ); ?></h2>
    <p class="description">
        <?php esc_html_e(
            'Verify that the Key ID and API Secret are valid by making a test request to the Nudgio API.',
            'nudgio'
        ); ?>
    </p>
    <p>
        <button type="button" id="nudgio-test-connection" class="button button-secondary">
            <?php esc_html_e( 'Test Connection', 'nudgio' ); ?>
        </button>
        <span id="nudgio-test-result" style="margin-left: 10px;"></span>
    </p>

    <hr />

    <!-- Shortcode Usage -->
    <h2><?php esc_html_e( 'Shortcode Usage', 'nudgio' ); ?></h2>
    <p class="description">
        <?php esc_html_e(
            'Add the [nudgio] shortcode to any page or post. Attributes override default settings above.',
            'nudgio'
        ); ?>
    </p>
    <table class="widefat fixed" style="max-width: 700px;">
        <thead>
            <tr>
                <th><?php esc_html_e( 'Example', 'nudgio' ); ?></th>
                <th><?php esc_html_e( 'Description', 'nudgio' ); ?></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><code>[nudgio]</code></td>
                <td><?php esc_html_e( 'Uses all default settings.', 'nudgio' ); ?></td>
            </tr>
            <tr>
                <td><code>[nudgio type="bestsellers" count="6"]</code></td>
                <td><?php esc_html_e( 'Show 6 bestsellers.', 'nudgio' ); ?></td>
            </tr>
            <tr>
                <td><code>[nudgio type="cross-sell"]</code></td>
                <td><?php esc_html_e( 'Cross-sell on product pages (auto-detects product ID).', 'nudgio' ); ?></td>
            </tr>
            <tr>
                <td><code>[nudgio type="upsell" style="carousel"]</code></td>
                <td><?php esc_html_e( 'Upsell carousel on product pages.', 'nudgio' ); ?></td>
            </tr>
            <tr>
                <td><code>[nudgio type="similar" product_id="123"]</code></td>
                <td><?php esc_html_e( 'Similar products for a specific product ID.', 'nudgio' ); ?></td>
            </tr>
        </tbody>
    </table>
    <p class="description" style="margin-top: 8px;">
        <?php esc_html_e(
            'Available attributes: type, count, style, columns, size, device, product_id, primary_color, text_color, bg_color, border_radius, lookback_days, method, min_price_increase_percent.',
            'nudgio'
        ); ?>
    </p>
</div>

<!-- Test Connection JavaScript -->
<script type="text/javascript">
(function() {
    var btn = document.getElementById('nudgio-test-connection');
    var result = document.getElementById('nudgio-test-result');
    if (!btn) return;

    btn.addEventListener('click', function() {
        btn.disabled = true;
        btn.textContent = '<?php echo esc_js( __( 'Testing...', 'nudgio' ) ); ?>';
        result.textContent = '';
        result.style.color = '';

        var data = new FormData();
        data.append('action', 'nudgio_test_connection');
        data.append('nonce', '<?php echo esc_js( wp_create_nonce( 'nudgio_test_connection' ) ); ?>');

        fetch(ajaxurl, {
            method: 'POST',
            body: data,
            credentials: 'same-origin',
        })
        .then(function(response) { return response.json(); })
        .then(function(json) {
            if (json.success) {
                result.textContent = json.data;
                result.style.color = '#00a32a';
            } else {
                result.textContent = json.data;
                result.style.color = '#d63638';
            }
        })
        .catch(function(err) {
            result.textContent = '<?php echo esc_js( __( 'Request failed.', 'nudgio' ) ); ?>';
            result.style.color = '#d63638';
        })
        .finally(function() {
            btn.disabled = false;
            btn.textContent = '<?php echo esc_js( __( 'Test Connection', 'nudgio' ) ); ?>';
        });
    });
})();
</script>
