Ext.define('DocsApp.view.carousel.Carousel', {
    extend: 'Ext.panel.Panel',
    xtype: 'carousel',

    requires: ['Ext.dd.DragTracker'],

    activeItem: 0,

    animate: true,

    direction: 'horizontal', // or 'vertical'

    lastActiveItem: null,

    allowSwipe: false,

    swipeDelegate: null, // can be any domQuery selector or child element per dragtracker API or for panel header use: '.' + Ext.baseCSSPrefix + 'header'

    isScrolling: false, // private

    allowLoop: false,

    infinite: false, // only allowLoop or infinite can be true if at all and in a tie allowLoop wins

    layoutEl: null, // private

    initComponent: function() {
        var me = this,
            items = me.items || [],
            len = items.length,
            i = 0,
            item;

        if (me.direction === 'horizontal') {
            me.layout = {
                type: 'hbox',
                align: 'stretch'
            };
        } else {
            me.layout = 'anchor';
        }

        for (; i < len; i++) {
            item = items[i];

            if (me.direction === 'horizontal') {
                item.width = item.width || '100%';
            } else {
                if (!item.height) {
                    item.anchor = '100% 100%';
                }
            }
        }

        me.callParent(arguments);
    },

    initSwipable: function() {
        var me = this;

        me.swipeTracker = new Ext.dd.DragTracker({
            el: me.body,
            onBeforeStart: Ext.bind(me.onBeforeSwipeStart, me),
            onDrag: Ext.bind(me.onSwipe, me),
            onEnd: Ext.bind(me.onSwipeEnd, me),
            delegate: me.swipeDelegate
        });
    },

    onBeforeSwipeStart: function(e) {
        var me = this;

        if (me.allowSwipe === true) {
            me.isSwiping = true;
            me.startingScrollPos = me.getLayoutEl().getScroll();
        } else {
            return false;
        }
    },

    onSwipe: function(e) {
        if (!this.isSwiping) {
            return;
        }
        console.log(e);
        var me = this,
            st = me.swipeTracker,
            startXY = st.startXY,
            xy = e.getXY(),
            layoutEl = me.getLayoutEl(),
            dir = me.direction,
            dirIndex = (dir === 'horizontal') ? 0 : 1,
            scrollDir = (dir === 'horizontal') ? 'left' : 'top',
            start = me.startingScrollPos[scrollDir];

        layoutEl.scrollTo(scrollDir, (start + startXY[dirIndex] - xy[dirIndex]), false);
    },

    onSwipeEnd: function() {

    },

    afterLayout: function() {
        this.setActiveItem(this.activeItem, false);

        this.callParent(arguments);
    },

    onBoxReady: function() {
        var me = this,
            layoutEl = me.getLayoutEl(),
            styles;

        styles = {
            horizontal: {
                height: '100%',
                overflow: 'hidden'
            },
            vertical: {
                position: 'absolute',
                bottom: '0px',
                overflow: 'hidden'
            }
        };

        layoutEl.setStyle(styles[me.direction]);

        me.initSwipable();

        me.callParent(arguments);
    },

    getLayoutEl: function() {
        return this.layoutEl || this.layout.getRenderTarget();
    },

    setActiveItem: function(cmp, anim) {
        var me = this,
            target = me.getComponent(cmp),
            layoutEl = me.getLayoutEl(),
            anim = !Ext.isEmpty(anim) ? anim : me.animate;

        if (target && me.isScrolling === false) {
            me.lastActiveItem = me.getComponent(me.activeItem);
            me.activeItem = target;

            if (me.lastActiveItem !== target) {

                me.isScrolling = true;

                if (me.fireEvent('beforeactiveitemchange', me, cmp, me.lastActiveItem) !== false) {
                    if (anim) {
                        anim = Ext.apply({
                            listeners: {
                                afteranimate: me.onAnimationEnd,
                                scope: me
                            }
                        }, anim);
                    }

                    target.getEl().scrollIntoView(layoutEl, true, anim);

                    if (me.lastActiveItem !== target && !anim) {
                        me.onAnimationEnd();
                    }
                }

            } else {
                target.getEl().scrollIntoView(layoutEl, true, anim);
            }
        }

        return me;
    },

    onAnimationEnd: function() {
        var me = this;

        me.isScrolling = false;
        me.fireEvent('activeitemchange', me, me.activeItem, me.lastActiveItem);

        return me;
    },

    next: function(selector, anim) {
        return this.scrollToSibling('next', selector, anim);
    },

    previous: function(selector, anim) {
        return this.scrollToSibling('prev', selector, anim);
    },

    scrollToSibling: function(dir, selector, anim) {
        var me = this,
            activeItem = me.getComponent(me.activeItem),
            sibling, ownerCt, items, peer;

        if (activeItem && me.isScrolling !== true) {
            ownerCt = activeItem.ownerCt;
            items = ownerCt.items;
            sibling = activeItem[dir](selector);

            if (!sibling) {
                peer = items.getAt(dir === 'next' ? 0 : items.getCount() - 1);
                if (me.allowLoop === true) {
                    sibling = peer;
                } else if (me.infinite === true) {
                    ownerCt.suspendLayouts();
                    peer = ownerCt.remove(peer, false);
                    sibling = (dir === 'next') ? ownerCt.add(peer) : ownerCt.insert(0, peer);
                    ownerCt.resumeLayouts(true);
                }
            }

            return me.setActiveItem(sibling, anim);
        } else {
            return me;
        }
    }
}, function() {
    var Carousel = this;

    Carousel.createAlias({
        prev: 'previous'
    });
});