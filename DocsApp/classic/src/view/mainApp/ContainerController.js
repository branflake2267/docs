Ext.define('DocsApp.view.mainApp.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.docsapp-mainapp-container',

    routes: {
        '!/guide/:id'  : 'onGuide',
        '!/api/:id'    : {
            action     : 'onApi',
            conditions : {
                ':id'  : '(?:([A-Za-z.]+))'
            }
        }
    },

    onMainAppAfterrender: function() {},

    onGuide: function(id) {
        var store = Ext.getStore('guide.Topical');

        if (store.isLoaded()) {
            var node     = store.getNodeById(id),
                tabpanel = this.lookupReference('mainapp-tabpanel'),
                tab      = tabpanel.child('[guideId=' + id + ']');

            tabpanel.suspendLayouts();

            if (!tab) {
                tab = tabpanel.add({
                    xtype: 'mainapp-guide-view',
                    guideId: id
                });
            }

            tabpanel.setActiveItem(tab);

            tabpanel.resumeLayouts(true);
        } else {
            store.on('load', Ext.Function.bind(this.onGuide, this, [id], false), this, {single: true});
        }
    },

    onApi: function (id) {
        var store = Ext.getStore('doc.Package');

        if (store.isLoaded()) {
            var node = store.findNode('className', id),
                tabpanel, tab;

            if (!node) {
                Ext.Msg.alert(id + ' class not found.');
                return;
            }

            tabpanel = this.lookupReference('mainapp-tabpanel'),
            tab      = tabpanel.child('[className=' + id + ']');

            tabpanel.suspendLayouts();

            if (!tab) {
                tab = tabpanel.add({
                    xtype: 'mainapp-doc-view',
                    className: id
                });
            }

            tabpanel.setActiveItem(tab);

            tabpanel.resumeLayouts(true);
        } else {
            store.on('load', Ext.Function.bind(this.onApi, this, [id], false), this, {single: true});
        }
    },

    onTabChange : function(tabpanel, newTab) {
        var route = newTab.getRoute ? newTab.getRoute() : null;

        if (route) {
            this.redirectTo(route);
        }
    }
});
