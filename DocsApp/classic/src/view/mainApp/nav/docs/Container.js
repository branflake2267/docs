Ext.define('DocsApp.view.mainApp.nav.docs.Container', {
    extend: 'Ext.panel.Panel',
    xtype: 'mainapp-nav-docs-container',

    viewModel: {
        type: 'nav-docs'
    },

    title: 'API Docs',
    iconCls: 'x-fa fa-code',

    layout: 'border',

    items: [{
        xtype: 'container',
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
        xtype: 'tagfield',
        region: 'north',
        fieldLabel: 'Packages',
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
    }, {
        xtype: 'tabpanel',
        region: 'center',
        tabPosition: 'bottom',
        items: [{
            xtype: 'treepanel',
            title: 'by Package',
            rootVisible: false,
            displayField: 'name',
            bind: '{package}'
        }, {
            xtype: 'treepanel',
            title: 'by Inheritance',
            rootVisible: false,
            bind: '{inheritance}'
        }, {
            title: 'Favorites'
        }],

        bbar: ['->', {
            xtype: 'checkboxfield',
            fieldLabel: 'Show Private Classes',
            labelWidth: 130
        }, '->']
    }]
});
