Ext.define('DocsApp.view.mainApp.nav.Container', {
    extend: 'Ext.tab.Panel',
    xtype: 'mainapp-nav-container',
    
    requires: [
        'DocsApp.view.mainApp.nav.docs.Container',
        'DocsApp.view.mainApp.nav.guides.Container'
    ],
    
    items: [{
        xtype: 'mainapp-nav-docs-container'
    }, {
        xtype: 'mainapp-nav-guides-container'
    }, {
        title: 'Examples',
        iconCls: 'x-fa fa-desktop'
    }]
});