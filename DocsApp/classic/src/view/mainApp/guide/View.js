Ext.define('DocsApp.view.mainApp.guide.View', {
    extend: 'Ext.panel.Panel',
    xtype : 'mainapp-guide-view',

    controller: 'main-guide-controller',

    config: {
        guidePath   : null,
        route       : null,
        focusHeading: null
    },

    cls        : 'da-guide-body',
    iconCls    : 'x-fa fa-book',
    bodyPadding: '2 20 20 20',
    scrollable : true,

    lbar: [{
        iconCls: 'x-fa fa-star',
        handler: 'addFavorite'
    }],

    destroy: function () {
        this.tocDock = null;

        this.callParent();
    },

    updateGuidePath: function (path) {
        if (path) {
            var store = Ext.getStore('guide.Topical');

            if (store.isLoaded()) {
                this.handleNode(path);
            } else {
                store.on('load', Ext.Function.bind(this.handleNode, this, [path], false), this, {single: true});
            }
        }
    },

    handleNode: function (path) {
        var me      = this,
            store   = Ext.getStore('guide.Topical'),
            node    = store.findNode('path', path),
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
                me.tocDock = me.addDocked({
                    xtype: 'component',
                    cls  : 'da-guide-toc',
                    dock : 'right',
                    width: 340,
                    data : headers,
                    tpl  : new Ext.XTemplate(
                        '<tpl for=".">',
                            '<a class="da-guide-toc-{tag}{[this.isFirst(xindex)]}" da-data="{name}" href="{[this.getHref(values)]}">{name}</a>',
                        '</tpl>',
                        {
                            isFirst: function (xindex) {
                                return xindex === 1 ? ' da-highlightTocNode' : '';
                            },
                            getHref: function (values) {
                                /*var id = values.id,
                                    parse = id.split('_-_'),
                                    guide = parse[0].split('-_-').pop(),
                                    header = parse.pop().replace(/-/g, '_');

                                return '#!/guide/' + guide + '-' + header;*/
                                var id = values.id,
                                    parse = id.split('_-_'),
                                    guide = parse[0].split('-_-').join('/'),
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
    },

    getRoute: function () {
        var str = '#!/guide/' + this.getGuidePath(),
            focusHeading = this.getFocusHeading();

        if (focusHeading) {
            str += '-' + focusHeading;
        }

        return str;
    }
});
