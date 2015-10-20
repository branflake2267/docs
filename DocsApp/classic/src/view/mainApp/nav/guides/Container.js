Ext.define('DocsApp.view.mainApp.nav.guides.Container', {
    extend: 'Ext.tab.Panel',
    xtype: 'mainapp-nav-guides-container',

    requires: [
        'DocsApp.view.mainApp.nav.guides.GuidesVavModel'
    ],

    viewModel: {
        type: 'nav-guides'
    },

    title: 'Guides',
    iconCls: 'x-fa fa-book',
    tabPosition: 'bottom',

    items: [{
        xtype: 'gridpanel',
        title: 'Guided View',
        hideHeaders: true,
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
        xtype: 'treepanel',
        title: 'Topical View',
        rootVisible: false,
        hideHeaders: true,
        bind: '{topical}',
        columns: [
            {
                xtype: 'treecolumn',
                flex: 1,
                dataIndex: 'name',
                renderer: function(text, meta, record) {
                    var href = record.get('link');

                    return href ? '<a href="' + href + '" target="_blank">' + text + '</a>' : text;
                }
            }
        ],
        tbar: ['->', {
            text: 'Expand All'
        }]
    }, {
        title: 'Favorites'
    }]
});
