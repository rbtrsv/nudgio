<?php
/**
 * Nudgio Settings — WP Admin Settings Page
 *
 * Registers the settings page under Settings → Nudgio Technologies.
 * Uses WordPress Settings API (register_setting, add_settings_section, add_settings_field).
 *
 * API secret is encrypted via openssl_encrypt() with a key derived from AUTH_KEY
 * (wp-config.php) before storing in wp_options. WP does NOT guarantee encryption at rest.
 *
 * Includes "Test Connection" functionality — generates a signed URL server-side
 * and calls it via wp_remote_get to verify the API key works.
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Nudgio_Settings {

    // ==========================================
    // Encryption Constants
    // ==========================================

    /** OpenSSL cipher for encrypting the API secret in wp_options */
    const CIPHER_METHOD = 'aes-256-cbc';

    // ==========================================
    // Constructor — Register Settings
    // ==========================================

    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );

        // Handle "Test Connection" AJAX request
        add_action( 'wp_ajax_nudgio_test_connection', array( $this, 'ajax_test_connection' ) );
    }

    // ==========================================
    // Admin Menu
    // ==========================================

    /**
     * Add settings page under Settings → Nudgio Technologies.
     */
    public function add_settings_page() {
        add_options_page(
            __( 'Nudgio Technologies', 'nudgio' ),
            __( 'Nudgio Technologies', 'nudgio' ),
            'manage_options',
            'nudgio',
            array( $this, 'render_settings_page' )
        );
    }

    // ==========================================
    // Register Settings (WP Settings API)
    // ==========================================

    /**
     * Register all settings, sections, and fields.
     * Uses register_setting() with sanitization callbacks.
     */
    public function register_settings() {
        // --- API Credentials Section ---
        add_settings_section(
            'nudgio_credentials_section',
            __( 'API Credentials', 'nudgio' ),
            array( $this, 'credentials_section_callback' ),
            'nudgio'
        );

        register_setting( 'nudgio_settings', 'nudgio_key_id', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 0,
        ) );
        add_settings_field(
            'nudgio_key_id',
            __( 'Key ID', 'nudgio' ),
            array( $this, 'render_key_id_field' ),
            'nudgio',
            'nudgio_credentials_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_api_secret', array(
            'type'              => 'string',
            'sanitize_callback' => array( $this, 'sanitize_api_secret' ),
            'default'           => '',
        ) );
        add_settings_field(
            'nudgio_api_secret',
            __( 'API Secret', 'nudgio' ),
            array( $this, 'render_api_secret_field' ),
            'nudgio',
            'nudgio_credentials_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_server_url', array(
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => 'https://server.nudgio.tech',
        ) );
        add_settings_field(
            'nudgio_server_url',
            __( 'Server URL', 'nudgio' ),
            array( $this, 'render_server_url_field' ),
            'nudgio',
            'nudgio_credentials_section'
        );

        // --- Default Widget Settings Section ---
        add_settings_section(
            'nudgio_defaults_section',
            __( 'Default Widget Settings', 'nudgio' ),
            array( $this, 'defaults_section_callback' ),
            'nudgio'
        );

        register_setting( 'nudgio_settings', 'nudgio_default_type', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'bestsellers',
        ) );
        add_settings_field(
            'nudgio_default_type',
            __( 'Widget Type', 'nudgio' ),
            array( $this, 'render_default_type_field' ),
            'nudgio',
            'nudgio_defaults_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_default_count', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 4,
        ) );
        add_settings_field(
            'nudgio_default_count',
            __( 'Number of Products', 'nudgio' ),
            array( $this, 'render_default_count_field' ),
            'nudgio',
            'nudgio_defaults_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_default_style', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'card',
        ) );
        add_settings_field(
            'nudgio_default_style',
            __( 'Display Style', 'nudgio' ),
            array( $this, 'render_default_style_field' ),
            'nudgio',
            'nudgio_defaults_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_default_columns', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 4,
        ) );
        add_settings_field(
            'nudgio_default_columns',
            __( 'Columns', 'nudgio' ),
            array( $this, 'render_default_columns_field' ),
            'nudgio',
            'nudgio_defaults_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_default_size', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'default',
        ) );
        add_settings_field(
            'nudgio_default_size',
            __( 'Size', 'nudgio' ),
            array( $this, 'render_default_size_field' ),
            'nudgio',
            'nudgio_defaults_section'
        );

        register_setting( 'nudgio_settings', 'nudgio_default_primary_color', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_hex_color',
            'default'           => '#3B82F6',
        ) );
        add_settings_field(
            'nudgio_default_primary_color',
            __( 'Primary Color', 'nudgio' ),
            array( $this, 'render_color_field' ),
            'nudgio',
            'nudgio_defaults_section',
            array( 'option' => 'nudgio_default_primary_color', 'default' => '#3B82F6' )
        );

        register_setting( 'nudgio_settings', 'nudgio_default_text_color', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_hex_color',
            'default'           => '#1F2937',
        ) );
        add_settings_field(
            'nudgio_default_text_color',
            __( 'Text Color', 'nudgio' ),
            array( $this, 'render_color_field' ),
            'nudgio',
            'nudgio_defaults_section',
            array( 'option' => 'nudgio_default_text_color', 'default' => '#1F2937' )
        );

        register_setting( 'nudgio_settings', 'nudgio_default_bg_color', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_hex_color',
            'default'           => '#FFFFFF',
        ) );
        add_settings_field(
            'nudgio_default_bg_color',
            __( 'Background Color', 'nudgio' ),
            array( $this, 'render_color_field' ),
            'nudgio',
            'nudgio_defaults_section',
            array( 'option' => 'nudgio_default_bg_color', 'default' => '#FFFFFF' )
        );

        register_setting( 'nudgio_settings', 'nudgio_default_border_radius', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '8px',
        ) );
        add_settings_field(
            'nudgio_default_border_radius',
            __( 'Border Radius', 'nudgio' ),
            array( $this, 'render_border_radius_field' ),
            'nudgio',
            'nudgio_defaults_section'
        );
    }

    // ==========================================
    // Section Callbacks
    // ==========================================

    public function credentials_section_callback() {
        echo '<p>' . esc_html__(
            'Enter the Key ID and API Secret from your Nudgio dashboard (Connection → API Keys tab).',
            'nudgio'
        ) . '</p>';
    }

    public function defaults_section_callback() {
        echo '<p>' . esc_html__(
            'Default values used when shortcode attributes are not specified. Override per-shortcode with [nudgio type="..." count="..." style="..."].',
            'nudgio'
        ) . '</p>';
    }

    // ==========================================
    // Field Renderers
    // ==========================================

    public function render_key_id_field() {
        $value = get_option( 'nudgio_key_id', 0 );
        echo '<input type="number" name="nudgio_key_id" value="' . esc_attr( $value ) . '" class="regular-text" min="1" />';
        echo '<p class="description">' . esc_html__( 'The numeric Key ID from your Nudgio API key (shown as "ID" in the dashboard).', 'nudgio' ) . '</p>';
    }

    public function render_api_secret_field() {
        // Show placeholder if secret is stored — never display the actual encrypted value
        $stored = get_option( 'nudgio_api_secret', '' );
        $placeholder = $stored ? '••••••••••••••••' : '';
        echo '<input type="password" name="nudgio_api_secret" value="" class="regular-text" placeholder="' . esc_attr( $placeholder ) . '" autocomplete="off" />';
        echo '<p class="description">' . esc_html__( 'The nk_... secret from key creation. Leave empty to keep current value. Encrypted before storage.', 'nudgio' ) . '</p>';
    }

    public function render_server_url_field() {
        $value = get_option( 'nudgio_server_url', 'https://server.nudgio.tech' );
        echo '<input type="url" name="nudgio_server_url" value="' . esc_attr( $value ) . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__( 'Nudgio API server URL. Default: https://server.nudgio.tech', 'nudgio' ) . '</p>';
    }

    public function render_default_type_field() {
        $value = get_option( 'nudgio_default_type', 'bestsellers' );
        $types = array(
            'bestsellers' => __( 'Bestsellers', 'nudgio' ),
            'cross-sell'  => __( 'Cross-sell', 'nudgio' ),
            'upsell'      => __( 'Upsell', 'nudgio' ),
            'similar'     => __( 'Similar Products', 'nudgio' ),
        );
        echo '<select name="nudgio_default_type">';
        foreach ( $types as $k => $label ) {
            echo '<option value="' . esc_attr( $k ) . '"' . selected( $value, $k, false ) . '>' . esc_html( $label ) . '</option>';
        }
        echo '</select>';
    }

    public function render_default_count_field() {
        $value = get_option( 'nudgio_default_count', 4 );
        echo '<input type="number" name="nudgio_default_count" value="' . esc_attr( $value ) . '" class="small-text" min="1" max="20" />';
    }

    public function render_default_style_field() {
        $value = get_option( 'nudgio_default_style', 'card' );
        $styles = array(
            'card'     => __( 'Card Grid', 'nudgio' ),
            'carousel' => __( 'Carousel', 'nudgio' ),
        );
        echo '<select name="nudgio_default_style">';
        foreach ( $styles as $k => $label ) {
            echo '<option value="' . esc_attr( $k ) . '"' . selected( $value, $k, false ) . '>' . esc_html( $label ) . '</option>';
        }
        echo '</select>';
    }

    public function render_default_columns_field() {
        $value = get_option( 'nudgio_default_columns', 4 );
        echo '<input type="number" name="nudgio_default_columns" value="' . esc_attr( $value ) . '" class="small-text" min="2" max="6" />';
        echo '<p class="description">' . esc_html__( 'Max columns at full width (2–6). Responsive: 1 col mobile → 2 col tablet → N col desktop.', 'nudgio' ) . '</p>';
    }

    public function render_default_size_field() {
        $value = get_option( 'nudgio_default_size', 'default' );
        $sizes = array(
            'compact'  => __( 'Compact', 'nudgio' ),
            'default'  => __( 'Default', 'nudgio' ),
            'spacious' => __( 'Spacious', 'nudgio' ),
        );
        echo '<select name="nudgio_default_size">';
        foreach ( $sizes as $k => $label ) {
            echo '<option value="' . esc_attr( $k ) . '"' . selected( $value, $k, false ) . '>' . esc_html( $label ) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . esc_html__( 'Controls text, padding, and gap proportionally.', 'nudgio' ) . '</p>';
    }

    /**
     * Render a color picker field.
     * Reusable for primary_color, text_color, bg_color.
     */
    public function render_color_field( $args ) {
        $option  = $args['option'];
        $default = $args['default'];
        $value   = get_option( $option, $default );
        echo '<input type="color" name="' . esc_attr( $option ) . '" value="' . esc_attr( $value ) . '" />';
        echo '<code style="margin-left:8px;">' . esc_html( $value ) . '</code>';
    }

    public function render_border_radius_field() {
        $value = get_option( 'nudgio_default_border_radius', '8px' );
        echo '<input type="text" name="nudgio_default_border_radius" value="' . esc_attr( $value ) . '" class="small-text" />';
        echo '<p class="description">' . esc_html__( 'CSS border-radius value (e.g., 8px, 0.5rem, 50%).', 'nudgio' ) . '</p>';
    }

    // ==========================================
    // Sanitization — API Secret Encryption
    // ==========================================

    /**
     * Sanitize and encrypt the API secret before storing in wp_options.
     *
     * WP does NOT guarantee encryption at rest — we encrypt explicitly
     * using openssl_encrypt() with a key derived from AUTH_KEY (wp-config.php).
     *
     * If the input is empty, keep the existing stored value (user left field blank).
     */
    public function sanitize_api_secret( $input ) {
        // Empty input = keep current value
        if ( empty( $input ) ) {
            return get_option( 'nudgio_api_secret', '' );
        }

        // Encrypt the plaintext secret before storage
        return self::encrypt_secret( sanitize_text_field( $input ) );
    }

    // ==========================================
    // Encryption / Decryption Helpers
    // ==========================================

    /**
     * Derive an encryption key from WordPress AUTH_KEY salt.
     * AUTH_KEY is defined in wp-config.php — unique per installation.
     */
    private static function get_encryption_key() {
        // Use AUTH_KEY from wp-config.php as the base for key derivation
        $salt = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'nudgio-fallback-key';
        // SHA-256 produces exactly 32 bytes (256 bits) — matches aes-256-cbc key length
        return hash( 'sha256', $salt, true );
    }

    /**
     * Encrypt a plaintext secret for storage in wp_options.
     *
     * @param string $plaintext The API secret to encrypt.
     * @return string Base64-encoded ciphertext (IV prepended).
     */
    public static function encrypt_secret( $plaintext ) {
        $key    = self::get_encryption_key();
        $iv_len = openssl_cipher_iv_length( self::CIPHER_METHOD );
        $iv     = openssl_random_pseudo_bytes( $iv_len );

        $encrypted = openssl_encrypt( $plaintext, self::CIPHER_METHOD, $key, OPENSSL_RAW_DATA, $iv );

        // Prepend IV to ciphertext (needed for decryption), then base64 encode
        // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
        return base64_encode( $iv . $encrypted );
    }

    /**
     * Decrypt a stored secret from wp_options.
     *
     * @param string $encrypted Base64-encoded ciphertext (IV prepended).
     * @return string|false Plaintext secret, or false on failure.
     */
    public static function decrypt_secret( $encrypted ) {
        if ( empty( $encrypted ) ) {
            return false;
        }

        $key    = self::get_encryption_key();
        $iv_len = openssl_cipher_iv_length( self::CIPHER_METHOD );

        // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
        $raw = base64_decode( $encrypted, true );
        if ( false === $raw || strlen( $raw ) < $iv_len ) {
            return false;
        }

        // Extract IV (first $iv_len bytes) and ciphertext (remainder)
        $iv         = substr( $raw, 0, $iv_len );
        $ciphertext = substr( $raw, $iv_len );

        return openssl_decrypt( $ciphertext, self::CIPHER_METHOD, $key, OPENSSL_RAW_DATA, $iv );
    }

    // ==========================================
    // Settings Page Renderer
    // ==========================================

    /**
     * Render the settings page HTML.
     * Includes the settings form + Test Connection button.
     */
    public function render_settings_page() {
        require_once NUDGIO_PLUGIN_DIR . 'admin/views/settings-page.php';
    }

    // ==========================================
    // Test Connection (AJAX Handler)
    // ==========================================

    /**
     * Handle "Test Connection" AJAX request.
     *
     * Generates a signed URL server-side and calls the Nudgio API via wp_remote_get
     * to verify the API key is valid and the server is reachable.
     */
    public function ajax_test_connection() {
        // Verify nonce for AJAX security
        check_ajax_referer( 'nudgio_test_connection', 'nonce' );

        // Check user permissions
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( __( 'Permission denied.', 'nudgio' ) );
        }

        // Get stored credentials
        $key_id     = absint( get_option( 'nudgio_key_id', 0 ) );
        $encrypted  = get_option( 'nudgio_api_secret', '' );
        $server_url = esc_url_raw( get_option( 'nudgio_server_url', 'https://server.nudgio.tech' ) );

        if ( ! $key_id || empty( $encrypted ) ) {
            wp_send_json_error( __( 'Key ID and API Secret are required.', 'nudgio' ) );
        }

        // Decrypt the stored secret
        $secret = self::decrypt_secret( $encrypted );
        if ( false === $secret ) {
            wp_send_json_error( __( 'Failed to decrypt API secret. Try re-entering it.', 'nudgio' ) );
        }

        // Build signed URL for a simple bestsellers test
        $params = array(
            'key_id' => $key_id,
            'ts'     => time(),
            'nonce'  => bin2hex( random_bytes( 8 ) ),
            'top'    => 2,
            'style'  => 'card',
        );

        // Sort alphabetically for canonical query string
        ksort( $params );
        $canonical = http_build_query( $params );

        // Compute HMAC-SHA256 signature
        $params['sig'] = hash_hmac( 'sha256', $canonical, $secret );

        // Build the full URL
        $url = trailingslashit( $server_url ) . 'ecommerce/widget/bestsellers?' . http_build_query( $params );

        // Make the request
        $response = wp_remote_get( $url, array(
            'timeout' => 15,
            'headers' => array(
                'Accept' => 'text/html',
            ),
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error(
                sprintf(
                    /* translators: %s: error message */
                    __( 'Connection failed: %s', 'nudgio' ),
                    $response->get_error_message()
                )
            );
        }

        $status_code = wp_remote_retrieve_response_code( $response );
        $body        = wp_remote_retrieve_body( $response );

        if ( 200 === $status_code && ! empty( $body ) ) {
            wp_send_json_success( __( 'Connection successful! Nudgio API is reachable and responding.', 'nudgio' ) );
        } else {
            wp_send_json_error(
                sprintf(
                    /* translators: %d: HTTP status code, %s: response body excerpt */
                    __( 'Server responded with status %1$d: %2$s', 'nudgio' ),
                    $status_code,
                    wp_trim_words( wp_strip_all_tags( $body ), 20, '...' )
                )
            );
        }
    }
}
