Ext.define('DocsApp.view.mainApp.productVersion.ProductsMenu', {
    extend: 'DocsApp.view.mainApp.productVersion.Base',
    xtype: 'mainapp-productsmenu',

    initComponent: function () {
        this.store = {
            fields: [],
            data: this.lookupViewModel().get('products')
        };

        this.trackOver = true;

        this.callParent();
    }
});
