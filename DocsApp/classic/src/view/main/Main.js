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
                }],
                versions: [{
                    name: '6.0.1 classic'
                }, {
                    name: '6.0.1 modern'
                }, {
                    name: '6.0.0 classic'
                }, {
                    name: '6.0.0 modern'
                }, {
                    name: '5.1.2'
                }, {
                    name: '5.1.1'
                }, {
                    name: '5.1.0'
                }, {
                    name: '5.0.1'
                }, {
                    name: '5.0.0'
                }, {
                    name: '4.2.4'
                }, {
                    name: '4.2.3'
                }, {
                    name: '4.2.2'
                }, {
                    name: '4.2.1'
                }, {
                    name: '4.2.0'
                }, {
                    name: '4.1.3'
                }, {
                    name: '4.1.2'
                }, {
                    name: '4.1.1'
                }, {
                    name: '4.0.7'
                }, {
                    name: '4.0.6'
                }, {
                    name: '4.0.5'
                }, {
                    name: '4.0.4'
                }, {
                    name: '4.0.3'
                }, {
                    name: '4.0.2'
                }, {
                    name: '4.0.1'
                }, {
                    name: '4.0.0'
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
                }],
                versions: [{
                    name: '2.3.1'
                }, {
                    name: '2.3.0'
                }, {
                    name: '2.2.1'
                }, {
                    name: '2.2.0'
                }, {
                    name: '2.1.1'
                }, {
                    name: '2.1.0'
                }, {
                    name: '2.1.1'
                }, {
                    name: '2.0.2'
                }, {
                    name: '2.0.1'
                }, {
                    name: '2.0.0'
                }, {
                    name: '1.1.1'
                }, {
                    name: '1.1.0'
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
                text: 'Ext JS',
                handler: function () {
                    var view = this.up('main').down('mainapp-container');
                    view.setActiveItem(0, true);
                    view.items.getAt(1).mask();
                }
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
    }, {
        iconCls: 'x-fa fa-cog'
    }, {
        iconCls: 'x-fa fa-question-circle'
    }],

    items: [{
        // main landing page when accessing the app
        xtype: 'products-landing'
    }, {
        // product-specific page
        xtype: 'product-page'
    }, {
        // the main app view for docs, guides, and examples
        xtype: 'mainapp-container',
        reference: 'mainapp-container'
    }]
});
