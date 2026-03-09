/**
 * Nudgio Technologies — Gutenberg Block (Editor Script)
 *
 * Vanilla JS using wp.element.createElement() — no build process, no JSX.
 * Registers the nudgio/recommendations block with:
 *   - InspectorControls sidebar (4 panels: Widget Settings, Type-Specific, Colors, Appearance)
 *   - Placeholder preview in the main editor area
 *
 * All WordPress packages accessed via globals (wp.blocks, wp.blockEditor, wp.components, wp.element, wp.i18n).
 */
( function () {
    'use strict';

    var el             = wp.element.createElement;
    var registerBlock  = wp.blocks.registerBlockType;
    var useBlockProps  = wp.blockEditor.useBlockProps;
    var InspectorControls = wp.blockEditor.InspectorControls;
    var PanelColorSettings = wp.blockEditor.PanelColorSettings;
    var Fragment       = wp.element.Fragment;
    var __             = wp.i18n.__;

    // wp.components
    var PanelBody      = wp.components.PanelBody;
    var SelectControl  = wp.components.SelectControl;
    var RangeControl   = wp.components.RangeControl;
    var TextControl    = wp.components.TextControl;
    var Placeholder    = wp.components.Placeholder;

    // ==========================================
    // Conditional Control Visibility Map
    // ==========================================

    // Which fields are visible for each recommendation type
    var typeVisibility = {
        bestsellers:  { product_id: false, lookback_days: true,  method: true,  min_price_increase_percent: false },
        'cross-sell': { product_id: true,  lookback_days: true,  method: false, min_price_increase_percent: false },
        upsell:       { product_id: true,  lookback_days: false, method: false, min_price_increase_percent: true  },
        similar:      { product_id: true,  lookback_days: false, method: false, min_price_increase_percent: false },
    };

    // Whether the "Type-Specific Settings" panel should be shown at all
    function hasTypeSpecificSettings( type ) {
        var vis = typeVisibility[ type ];
        return vis && ( vis.lookback_days || vis.method || vis.min_price_increase_percent );
    }

    // ==========================================
    // Style Label Maps
    // ==========================================

    var typeLabels = {
        bestsellers:  'Bestsellers',
        'cross-sell': 'Cross-sell',
        upsell:       'Upsell',
        similar:      'Similar',
    };

    var styleLabels = {
        card:     'Card Grid',
        carousel: 'Carousel',
    };

    var sizeLabels = {
        compact:  'Compact',
        'default': 'Default',
        spacious: 'Spacious',
    };

    // ==========================================
    // Color Swatch Component
    // ==========================================

    /**
     * Renders a small color circle with a label underneath.
     * Used in the Placeholder preview to show the current color settings.
     */
    function ColorSwatch( props ) {
        return el( 'span', { style: { textAlign: 'center', marginRight: '12px' } },
            el( 'span', {
                style: {
                    display:      'inline-block',
                    width:        '20px',
                    height:       '20px',
                    borderRadius: '50%',
                    backgroundColor: props.color,
                    border:       '1px solid #ccc',
                    verticalAlign: 'middle',
                },
            } ),
            el( 'span', {
                style: { display: 'block', fontSize: '10px', color: '#757575', marginTop: '2px' },
            }, props.label )
        );
    }

    // ==========================================
    // Block Registration
    // ==========================================

    registerBlock( 'nudgio/recommendations', {

        // edit() — renders the block in the editor
        edit: function ( props ) {
            var attributes    = props.attributes;
            var setAttributes = props.setAttributes;
            var blockProps    = useBlockProps();

            var type          = attributes.type;
            var vis           = typeVisibility[ type ] || typeVisibility.bestsellers;

            // ------------------------------------------
            // Panel 1: Widget Settings
            // ------------------------------------------
            var widgetSettingsPanel = el( PanelBody, { title: __( 'Widget Settings', 'nudgio' ), initialOpen: true },

                // Type dropdown
                el( SelectControl, {
                    label: __( 'Recommendation Type', 'nudgio' ),
                    value: type,
                    options: [
                        { label: 'Bestsellers',  value: 'bestsellers' },
                        { label: 'Cross-sell',    value: 'cross-sell' },
                        { label: 'Upsell',        value: 'upsell' },
                        { label: 'Similar',       value: 'similar' },
                    ],
                    onChange: function ( val ) { setAttributes( { type: val } ); },
                } ),

                // Count slider
                el( RangeControl, {
                    label: __( 'Number of Products', 'nudgio' ),
                    value: attributes.count,
                    onChange: function ( val ) { setAttributes( { count: val } ); },
                    min: 1,
                    max: 20,
                } ),

                // Style dropdown
                el( SelectControl, {
                    label: __( 'Display Style', 'nudgio' ),
                    value: attributes.style,
                    options: [
                        { label: 'Card Grid', value: 'card' },
                        { label: 'Carousel',  value: 'carousel' },
                    ],
                    onChange: function ( val ) { setAttributes( { style: val } ); },
                } ),

                // Columns slider (2–6, max columns at full width)
                el( RangeControl, {
                    label: __( 'Columns', 'nudgio' ),
                    help: __( 'Max columns at full width. Responsive: 1 col mobile → 2 col tablet → N col desktop.', 'nudgio' ),
                    value: attributes.columns,
                    onChange: function ( val ) { setAttributes( { columns: val } ); },
                    min: 2,
                    max: 6,
                } ),

                // Size dropdown (compact / default / spacious)
                el( SelectControl, {
                    label: __( 'Size', 'nudgio' ),
                    help: __( 'Controls text, padding, and gap proportionally.', 'nudgio' ),
                    value: attributes.size,
                    options: [
                        { label: 'Compact',  value: 'compact' },
                        { label: 'Default',  value: 'default' },
                        { label: 'Spacious', value: 'spacious' },
                    ],
                    onChange: function ( val ) { setAttributes( { size: val } ); },
                } ),

                // Product ID — shown only for cross-sell, upsell, similar
                vis.product_id ? el( TextControl, {
                    label: __( 'Product ID', 'nudgio' ),
                    help: __( 'Leave empty to auto-detect on product pages.', 'nudgio' ),
                    value: attributes.product_id,
                    onChange: function ( val ) { setAttributes( { product_id: val } ); },
                } ) : null
            );

            // ------------------------------------------
            // Panel 2: Type-Specific Settings (conditional)
            // ------------------------------------------
            var typeSpecificPanel = null;

            if ( hasTypeSpecificSettings( type ) ) {
                var typeSpecificControls = [];

                // Lookback days — shown for bestsellers, cross-sell
                if ( vis.lookback_days ) {
                    typeSpecificControls.push(
                        el( RangeControl, {
                            key: 'lookback_days',
                            label: __( 'Lookback Days', 'nudgio' ),
                            help: __( 'Number of days to analyze for recommendations.', 'nudgio' ),
                            value: attributes.lookback_days,
                            onChange: function ( val ) { setAttributes( { lookback_days: val } ); },
                            min: 1,
                            max: 365,
                        } )
                    );
                }

                // Method — shown for bestsellers only
                if ( vis.method ) {
                    typeSpecificControls.push(
                        el( SelectControl, {
                            key: 'method',
                            label: __( 'Ranking Method', 'nudgio' ),
                            value: attributes.method,
                            options: [
                                { label: 'Volume (units sold)',       value: 'volume' },
                                { label: 'Value (revenue)',           value: 'value' },
                                { label: 'Balanced (volume + value)', value: 'balanced' },
                            ],
                            onChange: function ( val ) { setAttributes( { method: val } ); },
                        } )
                    );
                }

                // Min price increase percent — shown for upsell only
                if ( vis.min_price_increase_percent ) {
                    typeSpecificControls.push(
                        el( RangeControl, {
                            key: 'min_price_increase_percent',
                            label: __( 'Min Price Increase %', 'nudgio' ),
                            help: __( 'Only show products at least this % more expensive.', 'nudgio' ),
                            value: attributes.min_price_increase_percent,
                            onChange: function ( val ) { setAttributes( { min_price_increase_percent: val } ); },
                            min: 1,
                            max: 100,
                        } )
                    );
                }

                typeSpecificPanel = el( PanelBody, {
                    title: __( 'Type-Specific Settings', 'nudgio' ),
                    initialOpen: false,
                }, typeSpecificControls );
            }

            // ------------------------------------------
            // Panel 3: Color Settings
            // ------------------------------------------
            var colorPanel = el( PanelColorSettings, {
                title: __( 'Color Settings', 'nudgio' ),
                initialOpen: false,
                colorSettings: [
                    {
                        value: attributes.primary_color,
                        onChange: function ( val ) { setAttributes( { primary_color: val || '#3B82F6' } ); },
                        label: __( 'Primary Color', 'nudgio' ),
                    },
                    {
                        value: attributes.text_color,
                        onChange: function ( val ) { setAttributes( { text_color: val || '#1F2937' } ); },
                        label: __( 'Text Color', 'nudgio' ),
                    },
                    {
                        value: attributes.bg_color,
                        onChange: function ( val ) { setAttributes( { bg_color: val || '#FFFFFF' } ); },
                        label: __( 'Background Color', 'nudgio' ),
                    },
                ],
            } );

            // ------------------------------------------
            // Panel 4: Appearance
            // ------------------------------------------
            var ToggleControl = wp.components.ToggleControl;

            var appearancePanel = el( PanelBody, { title: __( 'Appearance', 'nudgio' ), initialOpen: false },

                // Border Radius
                el( TextControl, {
                    label: __( 'Border Radius', 'nudgio' ),
                    help: __( 'CSS value, e.g. 8px, 0.5rem, 0', 'nudgio' ),
                    value: attributes.border_radius,
                    onChange: function ( val ) { setAttributes( { border_radius: val } ); },
                } ),

                // Widget Title
                el( TextControl, {
                    label: __( 'Widget Title', 'nudgio' ),
                    help: __( 'Leave empty for auto-default based on widget type.', 'nudgio' ),
                    value: attributes.widget_title,
                    onChange: function ( val ) { setAttributes( { widget_title: val } ); },
                } ),

                // CTA Text
                el( TextControl, {
                    label: __( 'Button Text', 'nudgio' ),
                    help: __( 'Call-to-action text (e.g. View, Shop Now, Add to Cart).', 'nudgio' ),
                    value: attributes.cta_text,
                    onChange: function ( val ) { setAttributes( { cta_text: val } ); },
                } ),

                // Show Price toggle
                el( ToggleControl, {
                    label: __( 'Show Price', 'nudgio' ),
                    checked: attributes.show_price,
                    onChange: function ( val ) { setAttributes( { show_price: val } ); },
                } ),

                // Image Aspect Ratio
                el( SelectControl, {
                    label: __( 'Image Aspect Ratio', 'nudgio' ),
                    value: attributes.image_aspect,
                    options: [
                        { label: 'Square (1:1)',      value: 'square' },
                        { label: 'Portrait (3:4)',    value: 'portrait' },
                        { label: 'Landscape (16:9)',  value: 'landscape' },
                    ],
                    onChange: function ( val ) { setAttributes( { image_aspect: val } ); },
                } )
            );

            // ------------------------------------------
            // Sidebar — InspectorControls
            // ------------------------------------------
            var sidebar = el( InspectorControls, {},
                widgetSettingsPanel,
                typeSpecificPanel,
                colorPanel,
                appearancePanel
            );

            // ------------------------------------------
            // Main Area — Placeholder Preview
            // ------------------------------------------
            var summaryLine = ( typeLabels[ type ] || type )
                + ' \u00B7 ' + attributes.count + ' products'
                + ' \u00B7 ' + ( styleLabels[ attributes.style ] || attributes.style )
                + ' \u00B7 ' + attributes.columns + ' cols'
                + ' \u00B7 ' + ( sizeLabels[ attributes.size ] || attributes.size );

            var swatches = el( 'div', { style: { display: 'flex', alignItems: 'flex-start', marginTop: '8px' } },
                el( ColorSwatch, { color: attributes.primary_color, label: 'Primary' } ),
                el( ColorSwatch, { color: attributes.text_color,    label: 'Text' } ),
                el( ColorSwatch, { color: attributes.bg_color,      label: 'Background' } ),
                el( 'span', {
                    style: { fontSize: '11px', color: '#757575', marginLeft: '8px', alignSelf: 'center' },
                }, 'radius: ' + attributes.border_radius )
            );

            var placeholder = el( Placeholder, {
                icon: 'products',
                label: __( 'Nudgio Technologies', 'nudgio' ),
            },
                el( 'span', { style: { fontSize: '13px', color: '#555' } }, summaryLine ),
                swatches
            );

            // ------------------------------------------
            // Return — Fragment with sidebar + block content
            // ------------------------------------------
            return el( Fragment, {},
                sidebar,
                el( 'div', blockProps, placeholder )
            );
        },

        // save() returns null — server-side rendered via render.php
        save: function () {
            return null;
        },
    } );
} )();
