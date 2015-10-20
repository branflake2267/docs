/**
 * This is the main app view where you'll navigate to the various docs, guides, and
 * examples.  The nav options will be on the left with the content on the right/center.
 */

Ext.define('DocsApp.view.mainApp.Container', {
    extend: 'DocsApp.view.carousel.Carousel',
    xtype: 'mainapp-container',

    requires: [
        'DocsApp.view.mainApp.nav.Container',
        'DocsApp.view.mainApp.productVersion.ProductsMenu',
        'DocsApp.view.mainApp.productVersion.ProductsMenu',
        'DocsApp.view.mainApp.guide.View',
        'DocsApp.view.mainApp.doc.View',
        'DocsApp.view.mainApp.ContainerController'
    ],

    activeItem: 1,
    controller: 'docsapp-mainapp-container',

    items: [{
        xtype: 'container',
        width: 400,
        layout: {
            type: 'hbox',
            align: 'stretch'
        },
        defaults: {
            flex: 1
        },
        items: [{
            xtype: 'mainapp-productsmenu',
            reference: 'productsMenu',
            trackOver: true,
            listeners: {
                itemmouseenter: 'onProductEnter'
            }
        }, {
            xtype: 'mainapp-versionsmenu',
            reference: 'versionsMenu',
            listeners: {
                itemmouseenter: 'onVersionEnter'
            }
        }]
    }, {
        xtype: 'container',
        reference: 'mainapp-view',
        layout: 'border',
        items: [{
            xtype: 'mainapp-nav-container',
            reference: 'mainapp-leftnav',
            region: 'west',
            split: true,
            width: 320
        }, {
            xtype: 'tabpanel',
            reference: 'mainapp-tabpanel',
            region: 'center',
            defaults : {
                closable: true
            },
            items: [{
                xtype: 'mainapp-doc-view',
                className: 'Ext.panel.Panel'
            }],
            listeners: {
                tabchange : 'onTabChange'
            }
        }],

        listeners: {
            afterrender: 'onMainAppAfterrender'
        }
    }]
});
