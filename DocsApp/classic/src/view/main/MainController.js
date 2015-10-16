Ext.define('DocsApp.view.main.MainController', {
    extend : 'Ext.app.ViewController',
    alias  : 'controller.docsapp-main-main',

    routes : {
        '!:type:id' : {
            action     : 'goToView',
            conditions : {
                ':type' : '(?:(?:\/){1}(.+))?',
                ':id'   : '(?:(?:\/){1}(.+))?'
            }
        }
    },

    info : {
        'api' : {
            button : 'mainAppButton',
            idx    : 2
        },
        'example' : {
            button : 'mainAppButton',
            idx    : 2
        },
        'guide' : {
            button : 'mainAppButton',
            idx    : 2
        },
        'home' : {
            button : 'mainLandingButton',
            idx    : 0
        },
        'product' : {
            button : 'productPageButton',
            idx    : 1
        }
    },

    goToView : function(type) {
        var main    = this.getView(),
            info    = this.info[type || 'home'],
            idx, button;

        if (info) {
            idx    = info.idx;
            button = info.button;

            if (Ext.isDefined(idx)) {
                main.getLayout().setActiveItem(idx);

                //main.lookupReference('contextCarousel').setActiveItem(idx, true);
                main.lookupReference('contextCarousel').getLayout().setActiveItem(idx, true);
            }

            if (button) {
                main.lookupReference(button).toggle(true, true);
            }
        }
    },

    goToMainLanding : function(button, pressed) {
        if (pressed) {
            this.redirectTo('!/home');
        }
    },

    goToProductPage : function(button, pressed) {
        if (pressed) {
            this.redirectTo('!/product');
        }
    },

    goToMainApp : function(button, pressed) {
        if (pressed) {
            this.redirectTo('!/api');
        }
    },

    //
    onSearchChange: function (field, newVal) {
        if (newVal.length) {
            //
        }
    }
});
