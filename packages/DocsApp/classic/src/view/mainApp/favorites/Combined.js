/**
 * Created by seth on 10/22/15.
 */
Ext.define('DocsApp.view.mainApp.favorites.Combined', {
    extend: 'Ext.grid.Panel',
    xtype: 'mainapp-favorites-combined',

    iconCls: 'x-fa fa-star',
    tabConfig: {
        ui: 'favorite'
    },
    hideHeaders: true,
    features: [{
        ftype:'grouping',
        groupHeaderTpl: '{name}'
    }],
    columns: [{
        text     : 'name',
        dataIndex: 'name',
        flex     : 1
    }, {
        xtype: 'actioncolumn',
        align: 'center',
        width:50,
        items: [{
            iconCls: 'x-fa fa-minus-circle',
            tooltip: 'Remove',
            handler: function(grid, rowIndex, colIndex) {
                var store = grid.getStore();
                store.remove(store.getAt(rowIndex));
            }
        }]
    }],
    bind: '{favorites}',
    listeners: {
        itemclick: 'onFavoriteClick'
    }
});