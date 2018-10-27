/**
 * Created by seth on 11/2/15.
 */
Ext.define('DocsApp.view.mainApp.doc.MemberListMenu', {
    extend: 'Ext.panel.Panel',
    xtype: 'memberlistmenu',

    requires: ['DocsApp.view.mainApp.doc.MemberListView'],

    floating: true,
    layout: 'fit',
    items: [{
        /*xtype: 'panel',
        //title: 'Panel Title',
        html: 'Member List',
        bodyPadding: 20*/
        xtype: 'memberlistview',
        reference: 'memberListView'
    }],

    onDestroy: function () {
        if (this.listMenuBtn) {
            delete menu.listMenuBtn;
        }

        this.callParent();
    }
});