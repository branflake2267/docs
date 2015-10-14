Ext.define('DocsApp.view.products.MainLanding', {
    extend: 'Ext.container.Container',
    xtype: 'products-landing',
    
    bind: {
        data: '{products}'
    },
    tpl: '<tpl for=".">' +
            '<div class="da-product-name">' +
                '{name}' +
            '</div>' +
            '<div class="da-product-links">' +
                '<tpl for="links">' +
                    '<a class="da-product-link ' +
                    '{[xindex === 1 ? "" : "da-link-spacer"]}">' +
                    '{displayName}' +
                    '</a>' +
                '</tpl>' +
            '</div>' +
        '</tpl>'
});