Ext.define('DocsApp.view.main.Main', {
    extend: 'Ext.panel.Panel',
    xtype: 'main',
    
    requires: [
        'DocsApp.view.carousel.Carousel',
        'DocsApp.view.products.MainLanding',
        'DocsApp.view.mainApp.Container',
        'DocsApp.view.products.ProductPage'
    ],
    
    /*controller: 'main',
    viewModel: {
        type: 'main'
    },*/
    
    viewModel: {
        data: {
            products: [{
                name: 'Ext JS',
                links: [{
                    displayName: 'API Docs (classic)'
                }, {
                    displayName: 'API Docs (modern)'
                }, {
                    displayName: 'Guides'
                }, {
                    displayName: 'Examples'
                }]
            }, {
                name: 'Touch',
                links: [{
                    displayName: 'API DOCS'
                }, {
                    displayName: 'Guides'
                }, {
                    displayName: 'Examples'
                }]
            }]
        }
    },
    
    layout: 'card',
    
    tbar: [{
        xtype: 'component',
        html: 'SENCHA'
    }, {
        xtype: 'carousel',
        direction: 'vertical',
        width: 300,
        height: 40,
        itemId: 'contextCarousel',
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
        enableToggle: true,
        allowDepress: false,
        toggleGroup: 'topNav',
        pressed: true,
        toggleHandler: function (btn, pressed) {
            if (pressed) {
                var main = this.up('main');
                main.getLayout().setActiveItem(0);
                main.down('#contextCarousel').setActiveItem(0, true);
            }
        }
    }, {
        text: 'Product Page',
        enableToggle: true,
        allowDepress: false,
        toggleGroup: 'topNav',
        toggleHandler: function (btn, pressed) {
            if (pressed) {
                var main = this.up('main');
                main.getLayout().setActiveItem(1);
                main.down('#contextCarousel').setActiveItem(1, true);
            }
        }
    }, {
        text: 'Main App',
        enableToggle: true,
        allowDepress: false,
        toggleGroup: 'topNav',
        toggleHandler: function (btn, pressed) {
            if (pressed) {
                var main = this.up('main');
                main.getLayout().setActiveItem(2);
                main.down('#contextCarousel').setActiveItem(2, true);
            }
        }
    }],
    
    items: [{
        // main landing page when accessing the app
        xtype: 'products-landing'
        
        // product-specific page
    }, {
        xtype: 'product-page'
        
        // the main app view for docs, guides, and examples
    }, {
        xtype: 'mainapp-container'
    }],
    
    listeners: {
        boxready: function () {
            //this.getLayout().setActiveItem(this.down('mainapp-container'), true);
        },
        delay: 2000
    }
});