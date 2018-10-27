Ext.define('DocsApp.view.mainApp.nav.Container', {
    extend: 'Ext.tab.Panel',
    xtype: 'mainapp-nav-container',

    requires: [
        'DocsApp.view.mainApp.nav.docs.Container',
        'DocsApp.view.mainApp.nav.guides.Container',
        'DocsApp.view.mainApp.nav.ContainerController'
    ],

    controller : 'docsapp-mainapp-nav-container',

    title: 'Navigation Panel',
    header: false,

    tabBar: {
        defaults: {
            flex: 1,
            minWidth: 40
        }
    },

    items: [{
        xtype: 'mainapp-nav-docs-container'
    }, {
        xtype: 'mainapp-nav-guides-container'

    // a dedicated tab for examples
    /*}, {
        xtype: 'tabpanel',
        title: 'Examples',
        iconCls: 'x-fa fa-desktop',
        tabPosition: 'bottom',
        items: [{
            title: 'Topical'
        }, {
            title: 'Favorites'
        }]*/
    }],

    listeners: {
        tabchange: 'onTabChange',
        resize: 'onTabResize'
    }
});
