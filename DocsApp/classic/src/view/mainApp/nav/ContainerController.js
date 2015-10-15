Ext.define('DocsApp.view.mainApp.nav.ContainerController', {
    extend : 'Ext.app.ViewController',
    alias  : 'controller.docsapp-mainapp-nav-container',

    routes : {
        '!:type:sub' : {
            action     : 'goToView',
            conditions : {
                ':type' : '(?:(?:\/){1}(.+))?',
                ':sub'  : '(?:(?:\/){1}(.+))?'
            }
        }
    },

    info : {
        'api' : {
            idx : 0
        },
        'example' : {
            idx : 2
        },
        'guide' : {
            idx  : 1
        }
    },

    goToView : function(type, sub) {
        var tabpanel = this.getView(),
            info     = this.info[type];

        if (info) {
            tabpanel.setActiveItem(info.idx);
        }

        console.log(type);
        console.log(sub);
    },

    onTabChange : function(tabpanel, tab) {
        var idx = tabpanel.items.indexOf(tab),
            hash;

        switch (idx) {
            case 1 :
                hash = 'guide';
                break;
            case 2 :
                hash = 'example';
                break;
            default :
                hash = 'api';
        }

        this.redirectTo('!/' + hash);
    }
});
