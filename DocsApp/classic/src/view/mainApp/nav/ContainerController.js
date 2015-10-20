Ext.define('DocsApp.view.mainApp.nav.ContainerController', {
    extend : 'Ext.app.ViewController',
    alias  : 'controller.docsapp-mainapp-nav-container',

    routes : {
        '!:type:sub' : {
            action     : 'goToView',
            conditions : {
                ':type' : '(?:(?:\/){1}([a-z]+))?',
                ':sub'  : '(?:(?:\/){1}([a-z]+))?'
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
    },

    onTabResize: function (nav, width) {
        nav.items.each(function (item) {
            if (width < 320) {
                if (!item.cacheTitle) {
                    item.cacheTitle = item.getTitle();
                }
                item.setTitle('');
                item.tab.setTooltip(item.cacheTitle);
            } else {
                if (item.cacheTitle) {
                    item.setTitle(item.cacheTitle);
                }
                item.tab.setTooltip(null);
            }
        });
    }
});
