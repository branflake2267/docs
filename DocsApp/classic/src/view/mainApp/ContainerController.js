Ext.define('DocsApp.view.mainApp.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.docsapp-mainapp-container',

    routes: {
        '!/guide/:id' : 'onGuide'
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

    onTabChange : function(tabpanel, newTab) {
        var route = newTab.getRoute ? newTab.getRoute() : null;

        if (route) {
            this.redirectTo(route);
        }
    }
});
