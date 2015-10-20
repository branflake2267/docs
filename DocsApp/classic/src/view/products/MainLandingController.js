Ext.define('DocsApp.view.products.MainLandingController', {
    extend : 'Ext.app.ViewController',
    alias  : 'controller.docsapp-products-mainlanding',

    routes : {
        '!/:type' : {
            action : 'goToView'
        }
    },

    info : {
        'ext' : {
            ref : 'ext'
        },
        'touch': {
            ref: 'touch'
        }
    },

    goToView : function(type) {
        if (this.info[type]) {
            var info = this.info[type],
                detailPanel = this.lookupReference(info.ref + 'Detail');

            detailPanel.expand();
            detailPanel.ownerCt.items.each(function (item) {
                if (item !== detailPanel && item.collapse) {
                    item.collapse();
                }
            });
        }


        /*var info = this.info[type],
            detailPanel = this.lookupReference(info.ref + 'Detail'),
            items = [];

        //detailPanel.expand();
        detailPanel.ownerCt.items.each(function (item) {
            var r = Ext.Number.randomInt(0, 1),
                x = item.getX();

            if (item !== detailPanel) {
                item.animate({
                    to: {
                        opacity: 0,
                        x: (r ? x + 200 : x - 200)
                    },
                    callback: function () {
                        items.push(item);
                        detailPanel.ownerCt.remove(item, false);
                    }
                });
            }
        });

        Ext.defer(function () {
            detailPanel.expand();
            Ext.defer(function () {
                Ext.each(items, function (item) {
                    detailPanel.ownerCt.add(item);
                    item.animate({
                        to: {
                            opacity: 1
                        }
                    });
                });
            }, 2000);
        }, 300);*/
    }
});
