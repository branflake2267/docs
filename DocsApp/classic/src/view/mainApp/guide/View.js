Ext.define('DocsApp.view.mainApp.guide.View', {
    extend: 'Ext.panel.Panel',
    xtype : 'mainapp-guide-view',

    controller: 'main-guide-controller',

    config: {
        guideId: null,
        route  : null
    },

    cls       : 'da-guide-body',
    iconCls   : 'x-fa fa-book',
    padding   : '2 20 20 20',
    scrollable: true,

    lbar: [{
        iconCls: 'x-fa fa-star',
        handler: 'addFavorite'
    }],

    destroy: function () {
        this.tocDock = null;

        this.callParent();
    },

    updateGuideId: function (id) {
        if (id) {
            var store = Ext.getStore('guide.Topical');

            if (store.isLoaded()) {
                this.handleNode(id);
            } else {
                store.on('load', Ext.Function.bind(this.handleNode, this, [id], false), this, {single: true});
            }
        }
    },

    handleNode: function (id) {
        var me      = this,
            store   = Ext.getStore('guide.Topical'),
            node    = store.getNodeById(id),
            headers = node.get('headers');

        me.setTitle(node.get('name'));
        //me.setRoute('!/guide/' + id);

        Ext.Ajax
            .request({
                url: 'resources/data/guides/' + node.get('path') + '.html'
            })
            .then(function (response) {
                var div = document.createElement('div'),
                    el, contents;

                div.innerHTML = response.responseText;

                el         = new Ext.dom.Element(div);
                contents   = el.child('.contents');

                me.update(contents.getHtml());
                //console.log(headers[1].id.split('_-_'));
                me.tocDock = me.addDocked({
                    xtype: 'component',
                    cls  : 'da-guide-toc',
                    dock : 'right',
                    width: 340,
                    data : headers,
                    tpl  : new Ext.XTemplate(
                        '<tpl for=".">',
                            '<a class="da-guide-toc-{tag}" da-data="{name}" href="{[this.getHref(values)]}">{name}</a>',
                        '</tpl>',
                        {
                            getHref: function (values) {
                                var id = values.id,
                                    parse = id.split('_-_'),
                                    guide = parse[0].split('-_-').pop(),
                                    header = parse.pop().replace(/-/g, '_');

                                return '#!/guide/' + guide + '-' + header;
                            }
                        })
                })[0];

                me.fireEvent('loaded');
            });
    },

    onScrollMove: function () {
        var el     = this.getEl(),
            els    = el.dom.querySelectorAll('h1, h2, h3, h4, h5, h6'),
            dock   = this.tocDock,
            tocEl  = dock.getEl(),
            count  = els.length,
            target = els[0],
            bodyY  = el.getY(),
            buffer = 25,
            i      = 0,
            target, tocTarget, el;

        for (; i < count; i++) {
            el = Ext.fly(els[i]);

            if (el.getY() <= bodyY + buffer) {
                target = el.dom.innerHTML;
            }
        }

        tocTarget = tocEl.selectNode('[da-data="' + target + '"]', false);

        if (tocTarget) {
            tocTarget.radioCls('da-highlightTocNode');
        }
    }
});
