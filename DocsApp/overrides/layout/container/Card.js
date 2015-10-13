Ext.define('OVERRIDE.layout.container.Card', {
    override: 'Ext.layout.container.Card',

    orientation: 'horizontal',

    resetOnWrap: true,
    
    beginLayout: function (ownerContext) {
        this.callParent(arguments);

        this.owner.getTargetEl().applyStyles({
            overflow: 'hidden'
        });
    },

    setActiveItem: function(newCard, anim) {
        var me = this,
            owner = me.owner,
            oldCard = me.activeItem,
            rendered = owner.rendered,
            newIndex, focusNewCard,
            oldIndex, targetEl, orientation, direction,
            dir, other, oldCardAnim, newCardAnim, dirs;

        newCard = me.parseActiveItem(newCard);
        newIndex = owner.items.indexOf(newCard);

        // If the card is not a child of the owner, then add it.
        // Without doing a layout!
        if (newIndex === -1) {
            newIndex = owner.items.items.length;
            Ext.suspendLayouts();
            newCard = owner.add(newCard);
            Ext.resumeLayouts();
        }

        // Is this a valid, different card?
        if (newCard && oldCard !== newCard) {
            // Fire the beforeactivate and beforedeactivate events on the cards
            if (newCard.fireEvent('beforeactivate', newCard, oldCard) === false) {
                return false;
            }
            if (oldCard && oldCard.fireEvent('beforedeactivate', oldCard, newCard) === false) {
                return false;
            }

            if (rendered) {
                Ext.suspendLayouts();

                // If the card has not been rendered yet, now is the time to do so.
                if (!newCard.rendered) {
                    me.renderItem(newCard, me.getRenderTarget(), owner.items.length);
                }

                if (oldCard) {
                    if (me.hideInactive) {
                        focusNewCard = oldCard.el.contains(Ext.Element.getActiveElement());
                        if (!anim) {
                            oldCard.hide();
                            if (oldCard.hidden) {
                                oldCard.hiddenByLayout = true;
                                oldCard.fireEvent('deactivate', oldCard, newCard);
                            }
                            // Hide was vetoed, we cannot change cards.
                            else {
                                owner.continueWrapping = false;
                                return false;
                            }
                        } else {
                            // CHECK FOR BEFOREHIDE PREVENTABLE
                            //oldCard.getEl().slideOut('l');
                            //oldCard.alignTo(owner, 'r-l', null, true);
                        }
                    }
                }
                // Make sure the new card is shown
                if (newCard.hidden) {
                    newCard.show();
                }

                // Layout needs activeItem to be correct, so clear it if the show has been vetoed,
                // set it if the show has *not* been vetoed.
                if (newCard.hidden) {
                    me.activeItem = newCard = null;
                } else {
                    me.activeItem = newCard;

                    // If the card being hidden contained focus, attempt to focus the new card
                    // So as not to leave focus undefined.
                    // The focus() call will focus the defaultFocus if it is a container
                    // so ensure there is a defaultFocus.
                    if (focusNewCard) {
                        if (!newCard.defaultFocus) {
                            newCard.defaultFocus = ':focusable';
                        }
                        newCard.focus();
                    }
                }
                Ext.resumeLayouts(true);

                if (anim) {
                    me.isAnimating = true;
                    
                    dirs = {
                        horizontal: {
                            forward: 'l',
                            back: 'r',
                            cont: {
                                forward: 'r',
                                back: 'l'
                            }
                        },
                        vertical: {
                            forward: 't',
                            back: 'b',
                            cont: {
                                forward: 'b',
                                back: 't'
                            }
                        }
                    };

                    oldIndex = owner.items.indexOf(oldCard);
                    targetEl = owner.getTargetEl();
                    orientation = dirs[me.orientation];
                    direction = newIndex > oldIndex ? 'forward' : 'back';
                    dir = me.continueWrapping ? orientation.cont[direction] : orientation[direction];
                    other = orientation[(dir === 'l' || dir === 't') ? 'back' : 'forward'];
                    
                    anim = Ext.isObject(anim) ? anim : {};
                    
                    oldCardAnim = Ext.apply(Ext.apply({}, anim), {
                        listeners: {
                            afteranimate: {
                                fn: function () {
                                    oldCard.alignTo(targetEl, 'br-tl');
                                    oldCard.hiddenByLayout = true;  // needed in the anim implementation?
	                                oldCard.fireEvent('deactivate', oldCard, newCard);
                                    oldCard.hide();
                                },
                                single: true
                            }
                        }
                    });
                    
                    newCardAnim = Ext.apply(Ext.apply({}, anim), {
                        listeners: {
                            afteranimate: {
                                fn: function () {
                                    newCard.fireEvent('activate', newCard, oldCard);
                                    me.isAnimating = false;
                                },
                                single: true
                            }
                        }
                    });
                    
                    oldCard.alignTo(targetEl, 'c-c');
                    oldCard.alignTo(targetEl, other + '-' + dir, null, oldCardAnim);
                    newCard.alignTo(targetEl, dir + '-' + other);
                    newCard.show(); // needed in the anim implementation?
                    newCard.alignTo(targetEl, 'c-c', null, newCardAnim);
                }
            } else {
                me.activeItem = newCard;
            }

            newCard.fireEvent('activate', newCard, oldCard);

            me.continueWrapping = false;
            return me.activeItem;
        }
        me.continueWrapping = false;
        return false;
    },

    getPrev: function() {
        var wrap = arguments[0],
            items = this.getLayoutItems(),
            index = Ext.Array.indexOf(items, this.activeItem);

        return items[index - 1] || (wrap ? items[items.length - 1] : 0);
    },

    prev: function() {
        var me = this,
            anim = arguments[0],
            wrap = arguments[1],
            owner = me.owner,
            items = owner.items,
            activeItem = me.activeItem,
            activeIndex = items.indexOf(activeItem),
            prev = me.getPrev(wrap),
            prevIndex = items.indexOf(prev);

        if (wrap && !me.resetOnWrap && prevIndex === items.getCount() - 1 && activeIndex === 0) {
            me.continueWrapping = true;
        }

        return me.setActiveItem(prev, anim);
    },

    getNext: function() {
        var wrap = arguments[0],
            items = this.getLayoutItems(),
            index = Ext.Array.indexOf(items, this.activeItem);

        return items[index + 1] || (wrap ? items[0] : items.length - 1);
    },

    next: function() {
        var me = this,
        	anim = arguments[0],
            wrap = arguments[1],
            owner = me.owner,
            items = owner.items,
            activeItem = me.activeItem,
            activeIndex = items.indexOf(activeItem),
            next = me.getNext(wrap),
            nextIndex = items.indexOf(next);
        
        if (wrap && !me.resetOnWrap && nextIndex === 0 && activeIndex === items.getCount() - 1) {
            me.continueWrapping = true;
        }
        
        return this.setActiveItem(next, anim);
    }
});