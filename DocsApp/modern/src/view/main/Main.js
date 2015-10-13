/**
 * This class is the main view for the application. It is specified in app.js as the
 * "mainView" property. That setting causes an instance of this class to be created and
 * added to the Viewport container.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('DocsApp.view.main.Main', {
    extend: 'Ext.tab.Panel',
    xtype: 'app-main',

    items: [
        {
            title: 'Home',
            iconCls: 'x-fa fa-home'
        },{
            title: 'Users',
            iconCls: 'x-fa fa-user'
        },{
            title: 'Groups',
            iconCls: 'x-fa fa-users'
        },{
            title: 'Settings',
            iconCls: 'x-fa fa-cog'
        }
    ]
});
