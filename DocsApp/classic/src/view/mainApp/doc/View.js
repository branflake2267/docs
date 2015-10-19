Ext.define('DocsApp.view.mainApp.doc.View', {
    extend: 'Ext.panel.Panel',
    xtype: 'mainapp-doc-view',

    viewModel: 'mainapp-docmodel',

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
                html: '{panel.name} alias: {panel.alias}'
            }
        }]
    }],

    // TODO:: temp listener to process an API Doc source during initial POC stage
    listeners: {
        afterrender: function (docView) {
            /*Ext.Ajax.request({
                url: 'resources/data/docs/panel.json',
                success: function (resp) {
                    docView.lookupViewModel().set({
                        // hack to get to the class info
                        doc: Ext.decode(resp.responseText).global.items[0]
                    });
                }
            });*/
        }
    },
});
