Ext.define('DocsApp.view.mainApp.MainAppController', {
    extend: 'DocsApp.view.main.MainController',
    alias: 'controller.mainapp-controller',

    onProductEnter: function (view, rec, rowEl) {
        var versionsMenu = this.getView().lookupReference('versionsMenu');

        Ext.fly(rowEl).radioCls('da-prod-ver-item-enter');
        versionsMenu.getStore().setData(rec.get('versions'));
    },

    onVersionEnter: function (view, rec, rowEl) {
        Ext.fly(rowEl).radioCls('da-prod-ver-item-enter');
    }
});
