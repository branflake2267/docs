Ext.define('DocsApp.view.mainApp.nav.docs.Container', {
    extend: 'Ext.panel.Panel',
    xtype: 'mainapp-nav-docs-container',

    requires: [
        'DocsApp.view.mainApp.nav.docs.ContainerController',
        'DocsApp.view.mainApp.nav.docs.DocsNavModel'
    ],

    controller: 'docsapp-mainapp-nav-docs-containercontainer',

    viewModel: {
        type: 'nav-docs'
    },

    title: 'API Docs',
    iconCls: 'x-fa fa-code',

    layout: 'border',

    tbar: [{
        xtype: 'container',
        layout: 'anchor',
        defaults: {
            anchor: '100%'
        },
        items: [{
            xtype: 'toolbar',
            region: 'north',
            layout: 'hbox',
            items: [{
                xtype: 'radiogroup',
                width: 250,
                margin: '0 0 0 12',
                fieldLabel: 'Toolkit',
                labelWidth: 70,
                columns: 2,
                items: [{
                    name: 'doc-nav-toolkit',
                    boxLabel: 'classic',
                    checked: true
                }, {
                    name: 'doc-nav-toolkit',
                    boxLabel: 'classic'
                }]
            }]
        }, {
            xtype: 'toolbar',
            region: 'north',
            items: [{
                xtype: 'tagfield',
                fieldLabel: 'Packages',
                labelWidth: 70,
                flex: 1,
                margin: '0 0 0 12',
                displayField: 'name',
                valueField: 'id',
                value: ['ext', 'charts', 'ux'],
                store: {
                    fields: [],
                    data: [{
                        name: 'ext',
                        id: 'ext'
                    }, {
                        name: 'charts',
                        id: 'charts'
                    }, {
                        name: 'ux',
                        id: 'ux'
                    }]
                }
            }]
        }]
    }],

    items: [{
        xtype: 'tabpanel',
        region: 'center',
        tabPosition: 'bottom',
        items: [{
            xtype: 'treepanel',
            reference: 'packageDocTree',
            title: 'by Package',
            rootVisible: false,
            displayField: 'name',
            //bind: '{package}',
            store: 'doc.Package',
            listeners: {
                itemclick: 'onApiClick'
            }
        }, {
            xtype: 'treepanel',
            title: 'by Inheritance',
            rootVisible: false,
            bind: '{inheritance}'
        }, {
            xtype: 'mainapp-favorites-combined',
            title: 'Favorites',
            iconCls: null,
            features: null,
            bind: '{favoritedocs}'
        }],

        bbar: ['->', {
            xtype: 'checkboxfield',
            fieldLabel: 'Show Private Classes',
            labelWidth: 130
        }, '->']
    }]
});
