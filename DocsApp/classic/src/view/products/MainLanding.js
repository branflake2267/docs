Ext.define('DocsApp.view.products.MainLanding', {
    extend: 'Ext.container.Container',
    xtype: 'products-landing',

    controller: 'docsapp-products-mainlanding',

    /*bind: {
        data: '{products}'
    },
    tpl: '<tpl for=".">' +
            '<div class="da-product-name">' +
                '{name}' +
            '</div>' +
            '<div class="da-product-links">' +
                '<tpl for="links">' +
                    '<a href="#!/{link}" class="da-product-link ' +
                    '{[xindex === 1 ? "" : "da-link-spacer"]}">' +
                    '{displayName}' +
                    '</a>' +
                '</tpl>' +
            '</div>' +
            '<div class="da-guided-ct-{name}"></div>' +
        '</tpl>',

    listeners: {
        afterrender: 'onMainLandingAfterrender'
    }*/

    initComponent: function () {
        var me = this,
            products = me.lookupViewModel().get('products'),
            items = [],
            i = 0,
            len = products.length,
            product, name, ref;

        for (; i < len; i++) {
            product = products[i];
            name = product.name;
            ref = product.ref;

            items.push({
                xtype: 'component',
                html: '<a href="#!/' + ref + '" class="da-product-name">' + name + '</a>'
            }, {
                xtype: 'component',
                data: product,
                tpl: '<div class="da-product-links">' +
                        '<tpl for="links">' +
                            '<a href="#!/{link}" class="da-product-link ' +
                            '{[xindex === 1 ? "" : "da-link-spacer"]}">' +
                            '{displayName}' +
                            '</a>' +
                        '</tpl>' +
                    '</div>'
            }, {
                xtype: 'panel',
                title: 'Ext JS Guided',
                width: 500,
                header: false,
                collapsed: true,
                reference: product.ref + 'Detail',
                items: [{
                    xtype: 'button',
                    text: 'Sample Button',
                    margin: 20
                }]
            });
        }

        me.items = items;

        me.callParent();
    }
});
