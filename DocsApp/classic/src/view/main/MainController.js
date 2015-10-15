Ext.define('DocsApp.view.main.MainController', {
    extend : 'Ext.app.ViewController',
    alias  : 'controller.docsapp-main-main',

    routes : {
        '!view/:id' : 'goToView'
    },

    goToView : function(id) {
        var main = this.getView(),
            idx, button;

        switch (id) {
            case 'product' :
                idx    = 1;
                button = 'productPageButton';
                break;
            case 'main' :
                idx    = 2;
                button = 'mainAppButton';
                break;
            default :
                idx    = 0;
                button = 'mainLandingButton';
        }

        main.getLayout().setActiveItem(idx);

        main.lookupReference('contextCarousel').setActiveItem(idx, true);
        main.lookupReference(button).setPressed(true);
    },

    goToMainLanding : function(button, pressed) {
        if (pressed) {
            this.redirectTo('!view/landing');
        }
    },

    goToProductPage : function(button, pressed) {
        if (pressed) {
            this.redirectTo('!view/product');
        }
    },

    goToMainApp : function(button, pressed) {
        if (pressed) {
            this.redirectTo('!view/main');
        }
    }
});
