/**
 * Created by seth on 10/20/15.
 */
Ext.define('DocsApp.store.doc.Package', {
    extend: 'Ext.data.TreeStore',

    root: {
        expanded: true
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
});