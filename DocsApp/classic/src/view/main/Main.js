Ext.define('DocsApp.view.main.Main', {
    extend: 'Ext.container.Container',
    
    /*controller: 'main',
    viewModel: {
        type: 'main'
    },*/
    
    layout: 'card',
    
    items: [{
        xtype: 'panel',
        title: 'Panel 1'
    }, {
        xtype: 'panel',
        title: 'Panel 2'
    }],
    
    listeners: {
        boxready: function () {
            this.getLayout().next(true, true);
        },
        delay: 2000
    }
    
    
    /*items: [{
        xtype: 'panel',
        tbar: [{
            xtype: 'senchatitle'
        }],
        layout: 'anchor',
        defaults: {
            anchor: '100%'
        },
        items: [{
            xtype: 'productnav',
            html: 'Ext JS'
        }, {
            xtype: 'container',
            cls: 'docsapp-main-prod-links',
            layout: {
                type: 'hbox',
                align: 'center',
                pack: 'middle'
            },
            defaultType: 'subnav',
            items: [{
                html: 'API Docs'
            }, {
                html: 'Guides',
                margin: '0 0 0 20'
            }, {
                html: 'Examples',
                margin: '0 0 0 20'
            }]
            
        }, {
            xtype: 'component',
            cls: 'docsapp-main-prod-title',
            html: 'Cmd',
            style: 'text-align: center;',
            margin: '40 0 0 0'
        }, {
            xtype: 'container',
            cls: 'docsapp-main-prod-links',
            layout: {
                type: 'hbox',
                align: 'center',
                pack: 'middle'
            },
            defaultType: 'subnav',
            items: [{
                html: 'Guides'
            }]
            
        }, {
            xtype: 'component',
            cls: 'docsapp-main-prod-title',
            html: 'IDE Plugins',
            style: 'text-align: center;',
            margin: '40 0 0 0'
        }, {
            xtype: 'container',
            cls: 'docsapp-main-prod-links',
            layout: {
                type: 'hbox',
                align: 'center',
                pack: 'middle'
            },
            defaultType: 'subnav',
            items: [{
                html: 'Guides'
            }]
            
        }, {
            xtype: 'component',
            cls: 'docsapp-main-prod-title',
            html: 'Inspector',
            style: 'text-align: center;',
            margin: '40 0 0 0'
        }, {
            xtype: 'container',
            cls: 'docsapp-main-prod-links',
            layout: {
                type: 'hbox',
                align: 'center',
                pack: 'middle'
            },
            defaultType: 'subnav',
            items: [{
                html: 'Guides'
            }]
            
        }, {
            xtype: 'component',
            cls: 'docsapp-main-prod-title',
            html: 'GXT',
            style: 'text-align: center;',
            margin: '40 0 0 0'
        }, {
            xtype: 'container',
            cls: 'docsapp-main-prod-links',
            layout: {
                type: 'hbox',
                align: 'center',
                pack: 'middle'
            },
            defaultType: 'subnav',
            items: [{
                html: 'API Docs'
            }, {
                html: 'Guides',
                margin: '0 0 0 20'
            }, {
                html: 'Examples',
                margin: '0 0 0 20'
            }]
        }]
        
        
    }, {
        xtype: 'contentct'
        
        
    }, {
        xtype: 'panel',
        tbar: [{
            xtype: 'senchatitle'
        }],
        layout: {
            type: 'vbox',
            align: 'center'
        },
        items: [{
            xtype: 'component',
            cls: 'docsapp-product-title',
            html: 'Ext JS'
        }, {
            xtype: 'container',
            cls: 'docsapp-main-prod-links docsapp-product-page-links',
            margin: '12 0 20 0',
            layout: {
                type: 'hbox',
                align: 'center'
            },
            defaultType: 'subnav',
            items: [{
                html: 'API Docs'
            }, {
                html: 'Guides',
                margin: '0 0 0 30'
            }, {
                html: 'Examples',
                margin: '0 0 0 30'
            }]
        }, {
            xtype: 'container',
            flex: 1,
            width: 700,
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            items: [{
                xtype: 'gridpanel',
                flex: 1,
                hideHeaders: true,
                columns: [{
                    text: 'Titles',
                    dataIndex: 'text',
                    flex: 1
                }],
                bind: '{extGuided}'
            }, {
                xtype: 'container',
                flex: 1,
                padding: 20,
                html: 'Hover over a topic to see a summary of the content covered in the guide / tutorial.'
            }]
        }]
    }]*/
});