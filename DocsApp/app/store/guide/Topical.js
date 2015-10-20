Ext.define('DocsApp.store.guide.Topical', {
    extend: 'Ext.data.TreeStore',

    root: {
        expanded: true
    },

    proxy: {
        type: 'ajax',
        url: 'resources/data/guide_tree.json'
    }
});
