Ext.define('DocsApp.view.mainApp.nav.docs.DocsNavModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.nav-docs',

    stores: {
        /*package: {
            type  : 'tree',
            root  : {
                expanded : true
            },
            proxy : {
                type : 'ajax',
                url  : 'resources/data/class_tree.json'
            },
            //TODO filter takes a bit of time :(
            filters : [
                {
                    operator : '!=',
                    property : 'access',
                    value    : 'private'
                }
            ]
        },*/
        inheritance: {
            type: 'tree',
            root: {
                children: [{
                    text: 'coming soon...'
                }]
            }
        }
    }
});
