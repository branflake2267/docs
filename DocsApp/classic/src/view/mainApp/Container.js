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
        'DocsApp.view.mainApp.doc.View'
    ],

    activeItem: 1,
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
            region: 'center',
            defaults : {
                closable: true
            },
            items: [{
                xtype: 'mainapp-doc-view',
                title: 'Ext.panel.Panel'
            }, {
                xtype: 'mainapp-guide-view',
                title: 'Memory Management'
            }, {
                title: 'Example Proto',
                iconCls: 'x-fa fa-desktop'
            }]
        }],

        listeners: {
            afterrender: 'onMainAppAfterrender'
        }
    }]
});
