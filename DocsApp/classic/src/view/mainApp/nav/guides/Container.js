Ext.define('DocsApp.view.mainApp.nav.guides.Container', {
    extend: 'Ext.tab.Panel',
    xtype: 'mainapp-nav-guides-container',

    requires: [
        'DocsApp.view.mainApp.nav.guides.ContainerController'
    ],

    controller: 'docsapp-mainapp-nav-guides-container',

    title: 'Guides',
    iconCls: 'x-fa fa-book',
    tabPosition: 'bottom',

    items: [{
        xtype: 'treepanel',
        reference: 'topicalGuideTree',
        title: 'Topical View',
        rootVisible: false,
        hideHeaders: true,
        store: 'guide.Topical',
        emptyText: '<div class="da-guide-empty-text">No guides found using the current filter.</div>',
        columns: [
            {
                xtype: 'treecolumn',
                flex: 1,
                dataIndex: 'name',
                renderer: function (text, meta, record) {
                    var href = record.get('link');

                    return href ? '<a href="' + href + '" target="_blank">' + text + '</a>' : text;
                }
            }
        ],
        tbar: [{
            xtype: 'textfield',
            emptyText: 'filter guides...',
            flex: 1,
            triggers : {
                clear: {
                    cls    : 'x-form-clear-trigger',
                    handler: function () {
                        this.reset();
                    }
                }
            },
            listeners: {
                change: 'onGuideFilterChange'
            }
        }, {
            text: 'Expand All',
            handler: 'toggleExpandAll',
            width: 100
        }],
        listeners: {
            itemclick: 'onGuideClick'
        }
    }, {
        xtype: 'gridpanel',
        title: 'Guided View',
        hideHeaders: true,
        tbar: [{
            xtype: 'textfield',
            emptyText: 'filter guides...',
            flex: 1
        }],
        columns: [{
            text: 'Titles',
            dataIndex: 'text',
            flex: 1
        }],
        store: {
            fields: [],
            data: [{
                text: 'Welcome to Ext JS'
            }, {
                text: 'Basic Install and Setup'
            }, {
                text: 'Components Overview'
            }, {
                text: 'Tutorial #1'
            }, {
                text: 'Containers and Layouts'
            }, {
                text: 'Tutorial #2'
            }, {
                text: 'Data: Models and Stores'
            }, {
                text: 'Tutorial #3'
            }, {
                text: 'Introduction to Applications'
            }, {
                text: 'View Controllers'
            }, {
                text: 'Tutorial #4'
            }, {
                text: 'View Models and Data Binding'
            }, {
                text: 'Tutorial #5'
            }, {
                text: 'Full Application Walkthrough'
            }]
        }
    }, {
        xtype: 'mainapp-favorites-combined',
        title: 'Favorites',
        iconCls: null,
        features: null,
        bind: '{favoriteguides}'
    }]
});
