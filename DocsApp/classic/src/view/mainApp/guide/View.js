Ext.define('DocsApp.view.mainApp.guide.View', {
    extend: 'Ext.panel.Panel',
    xtype: 'mainapp-guide-view',

    iconCls: 'x-fa fa-book',

    layout: {
        type: 'hbox',
        align: 'stretch'
    },

    items: [{
        xtype: 'container',
        cls: 'da-guide-body',
        padding: '2 20 20 20',
        scrollable: true,
        flex: 1,
        onScrollMove: function () {
            var guideBodyEl = this.getEl(),
                //els = guideBodyEl.query('h1, h2, h3', false),
                //els = guideBodyEl.select('h1, h2, h3'),
                els = guideBodyEl.dom.querySelectorAll('h1, h2, h3, h4, h5, h6'),
                tocEl = this.next().getEl(),
                count = els.length,
                target = els[0],
                bodyY = guideBodyEl.getY(),
                buffer = 25,
                i = 0,
                target, tocTarget, el;

            for (; i<count; i++) {
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
        loader: {
            url: 'resources/data/guides/memory_management.md',
            autoLoad: true,
            renderer: function(loader, response, active) {
                var text = response.responseText;

                text = marked(text);
                // spacer for scroll
                text += '<div class="da-guide-footer"></div>';
                loader.getTarget().setHtml(text);
                return true;
            },
            success: function (loader, resp, opts) {
                var body = loader.getTarget(),
                    tocPanel = body.next(),
                    i = 0,
                    toc = '',
                    bodyEl, els, len, el, tagName, buildToc;

                buildToc = function () {
                    bodyEl = body.getEl();
                    els = bodyEl.dom.querySelectorAll('h2, h3, h4, h5, h6');
                    len = els.length;
                    for (; i < len; i++) {
                        el = els[i];
                        tagName = el.tagName;
                        toc += '<a class="da-guide-toc-' + tagName + '" da-data="' + el.innerHTML + '">' + el.innerHTML + '</a>';
                    }
                    tocPanel.update(toc);
                }

                if (body.rendered) {
                    buildToc();
                } else {
                    body.on({
                        boxready: buildToc,
                        delay: 1,
                        single: true
                    });
                }
            }
        }
    }, {
        xtype: 'container',
        cls: 'da-guide-toc',
        scrollable: true,
        width: 340,
        padding: 20
    }]
});
