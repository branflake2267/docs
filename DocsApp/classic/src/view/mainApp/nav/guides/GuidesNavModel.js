Ext.define('DocsApp.view.mainApp.nav.guides.GuidesVavModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.nav-guides',

    stores: {
        topical: {
            type: 'tree',
            root: {
                expanded: true
            },
            proxy: {
                type: 'ajax',
                url: 'resources/data/guide_tree.json'
            }
        }
    }
});
