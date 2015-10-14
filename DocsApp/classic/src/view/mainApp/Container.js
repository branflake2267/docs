/**
 * This is the main app view where you'll navigate to the various docs, guides, and
 * examples.  The nav options will be on the left with the content on the right/center.
 */

Ext.define('DocsApp.view.mainApp.Container', {
    extend: 'Ext.container.Container',
    xtype: 'mainapp-container',
    
    requires: ['DocsApp.view.mainApp.nav.Container'],
    
    layout: 'border',
    items: [{
        xtype: 'mainapp-nav-container',
        region: 'west',
        split: true,
        width: 320
    }, {
        xtype: 'tabpanel',
        region: 'center',
        items: [{
            title: 'API Doc Proto',
            iconCls: 'x-fa fa-code'
        }, {
            title: 'Guide Proto',
            iconCls: 'x-fa fa-book'
        }, {
            title: 'Example Proto',
            iconCls: 'x-fa fa-desktop'
        }]
    }]
});