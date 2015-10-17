Ext.define('DocsApp.view.mainApp.doc.View', {
    extend: 'Ext.panel.Panel',
    xtype: 'mainapp-doc-view',

    iconCls: 'x-fa fa-code',
    closable: true,

    layout: 'anchor',
    defaults: {
        anchor: '100%'
    },
    items: [{
        xtype: 'container',
        items: [{
            xtype: 'component',
            bind: {
                // this doesn't work currently
                html: '{doc.name}'
            }
        }]
    }]
});
