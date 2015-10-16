Ext.define('DocsApp.view.mainApp.productVersion.Base', {
    extend: 'Ext.view.View',

    overItemCls: 'da-prod-ver-item-over',
    itemSelector: 'div.da-prod-ver-menu-item',
    scrollable: true,
    tpl: '<tpl for=".">' +
            '<div class="da-prod-ver-menu-item">' +
                '{name}' +
            '</div>' +
        '</tpl>'
});
