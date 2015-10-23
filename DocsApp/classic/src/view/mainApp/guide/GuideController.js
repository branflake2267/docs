Ext.define('DocsApp.view.mainApp.guide.GuideController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.main-guide-controller',

    addFavorite: function (btn) {
        var view = this.getView(),
            guideId = view.getGuideId().split('_-_').pop(),
            store = view.up('mainapp-container').lookupReference('favoritesCombined').getStore(),
            rec = store.getById(guideId);
        
        if (!rec) {
            store.add({
                name: view.getTitle(),
                id: guideId,
                hash: '!/api/' + guideId,
                type: 'Guides'
            });
        }
    }
});