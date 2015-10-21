/**
 * Created by seth on 10/20/15.
 */
Ext.define('DocsApp.view.mainApp.nav.docs.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.docsapp-mainapp-nav-docs-containercontainer',

    routes: {
        '!/api/:id' : {
            action     : 'onApi',
            conditions : {
                ':id'  : '(?:([A-Za-z.]+))'
            }
        }
    },

    onApiClick: function(treeView, node) {
        if (node.isLeaf()) {
            this.redirectTo('!/api/' + node.get('className'));
            //this.redirectTo('!/api/sss');
        }
    },

    onApi: function(id) {
        /*var me = this,
            tree = me.lookupReference('packageDocTree'),
            store = tree.getStore();

        if (store.getRoot().childNodes.length) {
            var node = store.findNode('className', id);

            //expand the path and select the node
            tree.expandPath(node.getPath(), {
                select : true,
                focus: true
            });
        } else {
            me.getView().lookupViewModel().bind('package', function () {
                me.onApi(id);
            }, me);
        }*/

        var me = this,
            store = Ext.getStore('doc.Package');

        if (store.isLoaded()) {
            var node = store.findNode('className', id),
                tree;

            if (!node) {
                return;
            }

            tree = me.lookupReference('packageDocTree');

            //expand the path and select the node
            tree.expandPath(node.getPath(), {
                select : true,
                focus: true
            });
        } else {
            store.on('load', Ext.Function.bind(me.onApi, me, [id], false), me, {single: true});
        }
    }
});