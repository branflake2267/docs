Ext.define('DocsApp.view.main.Main', {
    extend: 'Ext.panel.Panel',
    xtype: 'main',

    requires: [
        'DocsApp.view.carousel.Carousel',
        'DocsApp.view.products.MainLanding',
        'DocsApp.view.main.MainController',
        'DocsApp.view.mainApp.Container',
        'DocsApp.view.products.ProductPage',
        'DocsApp.view.main.SearchField'
    ],

    controller : 'docsapp-main-main',

    viewModel: {
        data: {
            products: [{
                name: 'Ext JS',
                ref: 'ext',
                links: [{
                    displayName: 'API Docs (classic)',
                    link: 'api'
                }, {
                    displayName: 'API Docs (modern)',
                    link: 'api'
                }, {
                    displayName: 'Guides',
                    link: 'guide'
                }, {
                    displayName: 'Examples',
                    link: 'example'
                }]
            }, {
                name: 'Touch',
                ref: 'touch',
                links: [{
                    displayName: 'API DOCS',
                    link: 'api'
                }, {
                    displayName: 'Guides',
                    link: 'guide'
                }, {
                    displayName: 'Examples',
                    link: 'example'
                }]
            }]
        }
    },

    layout: 'card',

    tbar: [{
        xtype: 'component',
        html: 'SENCHA'
    }, {
        xtype: 'container',
        reference: 'contextCarousel',
        direction: 'vertical',
        width: 300,
        height: 40,
        layout: {
            type: 'card',
            orientation: 'vertical'
        },
        items: [{
            xtype: 'component'
        }, {
            xtype: 'component'
        }, {
            xtype: 'container',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            items: [{
                xtype: 'button',
                text: 'Ext JS'
            }, {
                xtype: 'button',
                text: '6.0.1'
            }]
        }]
    }, '->', {
        text: 'Main Landing',
        reference: 'mainLandingButton',
        enableToggle: true,
        allowDepress: false,
        toggleGroup: 'topNav',
        toggleHandler: 'goToMainLanding'
    }, {
        text: 'Product Page',
        reference: 'productPageButton',
        enableToggle: true,
        allowDepress: false,
        toggleGroup: 'topNav',
        toggleHandler: 'goToProductPage'
    }, {
        text: 'Main App',
        reference: 'mainAppButton',
        enableToggle: true,
        allowDepress: false,
        toggleGroup: 'topNav',
        toggleHandler: 'goToMainApp'
    }, {
        xtype: 'main-searchfield',
        listeners: {
            change: 'onSearchChange'
        }
    }],

    items: [{
        // main landing page when accessing the app
        xtype: 'products-landing'
    }, {
        // product-specific page
        xtype: 'product-page'
    }, {
        // the main app view for docs, guides, and examples
        xtype: 'mainapp-container'
    }]
});
