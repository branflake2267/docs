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
        xtype: 'form',
        title: 'Package Selector',
        region: 'north',
        collapsible: true,
        collapsed: true,
        maxHeight: 400,
        scrollable: true,
        split: {
            collapsible: false
        },
        items: [{
            xtype: 'checkboxgroup',
            columns: 1,
            vertical: true,
            items: [{
                boxLabel: 'Ext JS',
                name: 'ext-packages',
                inputValue: 'ext',
                checked: true
            }, {
                boxLabel: 'Charts',
                name: 'ext-packages',
                inputValue: 'charts',
                checked: true
            }]
        }]
    }, {
        xtype: 'tabpanel',
        region: 'center',
        tabPosition: 'bottom',
        items: [{
            xtype: 'treepanel',
            title: 'by Package',
            rootVisible: false,
            bind: '{package}'
        }, {
            xtype: 'treepanel',
            title: 'by Inheritance',
            rootVisible: false,
            bind: '{inheritance}'
        }]
    }],

    bbar: ['->', {
        xtype: 'checkboxfield',
        fieldLabel: 'Show Private Classes',
        labelWidth: 130
    }, '->']
});
