function toggleDisplay(me) {

    if(me.checked === false) {
        valon = me.value + '-active';
        valoff = me.value;
    } else {
        valon = me.value;
        valoff = me.value + '-active';
    }

    var elements = document.querySelectorAll("." + valon);

    for (var i = 0; i < elements.length; i++) {
        ExtL.removeClass(elements[i], valon);
        ExtL.addClass(elements[i], valoff);
    }

}

(function() {
    if (!document.getElementsByClassName('classMeta')[0].innerHTML.trim()) {
        document.getElementsByClassName('classMeta')[0].style.display = 'none';
        document.getElementsByClassName('classMetaHeader')[0].style.display = 'none';
    }

    function forEach(arr, callback) {
        var i      = 0,
            length = arr.length;

        if (length) {
            for (; i < length; i++) {
                if (callback(arr[i]) === true) {
                    break;
                }
            }
        }
    }

    function highlightMemberMatch(member, value) {
        var re = new RegExp('(' + value + ')', 'ig');

        forEach(member.children, function(child) {
            if (child.tagName === 'H2') {
                forEach(child.children, function(c) {
                    c.innerHTML = c.textContent.replace(re, '<strong>$1</strong>');

                    return true;
                });

                return true;
            }
        });
    }

    function unhighlightMemberMatch(member) {
        forEach(member.children, function(child) {
            if (child.tagName === 'H2') {
                forEach(child.children, function(c) {
                    c.innerHTML = c.textContent;

                    return true;
                });

                return true;
            }
        });
    }

    document.getElementById('back-to-top').onclick = function(event) {
        event.preventDefault();
        window.scrollTo(0,0);
        return false;
    }

    //document.getElementById('tree-collapse').getElementsByTagName('a')[0].onclick = function(event) {
    document.getElementById('toggle-class-tree').onclick = function(event) {
        /*var treedisplay = document.getElementById('tree-collapse'),
         tree        = document.getElementById('tree');

         if(ExtL.hasClass(tree, 'tree-shown')) {
         ExtL.removeClass(tree, 'tree-shown');
         ExtL.addClass(tree, 'tree-hidden');
         }else {
         ExtL.removeClass(tree, 'tree-hidden');
         ExtL.addClass(tree, 'tree-shown');
         }

         //document.getElementById('rightMembers').style.marginLeft = 0px;
         return false;*/
        var tree = document.getElementById('class-tree-ct'),
            members = document.getElementById('rightMembers'),
            hiddenCls = 'tree-hidden',
            hidden = ExtL.hasClass(tree, hiddenCls);

        if (hidden) {
            ExtL.removeClass(tree, hiddenCls);
            ExtL.removeClass(members, hiddenCls);
        } else {
            ExtL.addClass(tree, hiddenCls);
            ExtL.addClass(members, hiddenCls);
        }
        return false;
    }

    document.getElementById('box').oninput = function() {
        var value        = this.value.trim(),
            matcher      = new RegExp(value, 'gi'),
            classmembers = document.getElementsByClassName('classmembers'),
            i            = 0,
            length       = classmembers.length,
            classMember;

        if (value) {
            ExtL.addClass(document.body, 'filtered');
        } else {
            ExtL.removeClass(document.body, 'filtered');
        }

        for (; i < length; i++) {
            classMember = classmembers[i];

            if (matcher.test(classMember.getAttribute('data-member-name'))) {
                ExtL.removeClass(classMember, 'hide');

                if (value) {
                    highlightMemberMatch(classMember, value);
                } else {
                    unhighlightMemberMatch(classMember);
                }
            } else {
                ExtL.addClass(classMember, 'hide');

                unhighlightMemberMatch(classMember);
            }
        }
    }

    if (ExtL.treeData) {
        new TreeView(ExtL.treeData, 'tree');
    }

    window.onscroll = function(e) {
        monitorScrollToTop();
        positionMembersBar();
        highlightTypeMenuItem();
    }

    function getScrollPosition() {
        var verticalPosition = 0;

        if (pageYOffset) {
            verticalPosition = pageYOffset;
        } else if (document.documentElement.clientHeight) { //ie
            verticalPosition = document.documentElement.scrollTop;
        } else if (document.body) { //ie quirks
            verticalPosition = document.body.scrollTop;
        }

        return verticalPosition;
    }

    function monitorScrollToTop() {
        var vertical_position = getScrollPosition(),
            scrollToTop = document.getElementById('back-to-top');

        if (vertical_position > 345) {
            ExtL.addClass(scrollToTop, 'sticky');
            ExtL.addClass(document.body, 'sticky');
        } else {
            ExtL.removeClass(scrollToTop, 'sticky');
            ExtL.removeClass(document.body, 'sticky');
        }
    }

    function positionMembersBar() {
        var membersEl = document.getElementById('rightMembers'),
            membersTop = membersEl.getBoundingClientRect().top,
            headerEl = document.querySelectorAll('h1.class')[0],
            headerHeight = headerEl.clientHeight - 2,
            toolbarsEl = document.getElementById('member-toolbars'),
            toolbarsHeight = toolbarsEl.offsetHeight,
            setFloat = membersTop <= headerHeight,
            membersWidth = document.querySelectorAll('.members')[0].clientWidth;

        ExtL[setFloat ? 'addClass' : 'removeClass'](toolbarsEl, 'stickyTypeFilter');
        toolbarsEl.style.top = setFloat ? (headerHeight + 2) + 'px' : null;
        toolbarsEl.style.width = setFloat ? membersWidth + 'px' : null;
        toolbarsEl.nextSibling.nextSibling.style.height = setFloat ? toolbarsHeight + 'px' : null;
    }

    function highlightTypeMenuItem() {
        var memberTypesEl = document.getElementById('toolbar'),
            memberTypeButtons = memberTypesEl.querySelectorAll('div.toolbarButton'),
            memberTypeLen = memberTypeButtons.length,
            memberTypesBottom = memberTypesEl.getBoundingClientRect().bottom,
            typeHeaders = document.querySelectorAll('h2.type'),
            len = typeHeaders.length,
            activeCls = 'active-type-menu-item',
            i = 0,
            item, itemTop, activeItem, activeButtonEl;

        // find the active type header by whichever scrolled above the nav header last
        for (; i < len; i++) {
            item = typeHeaders.item(i);
            itemTop = item.getBoundingClientRect().top;

            // the 10px is to account for the the 10px "shadow" below the fixed toolbar
            if (itemTop + 140 < memberTypesBottom + 10) {
                activeItem = item;
            }
        }

        // remove the activeCls from all nav buttons
        i = 0;
        for (; i < memberTypeLen; i++) {
            ExtL.removeClass(memberTypeButtons.item(i), activeCls);
        }
        // and then decorate the active one
        if (activeItem) {
            activeButtonEl = memberTypesEl.querySelectorAll('a[href="#' + activeItem.id + '"]').item(0).parentElement;
            ExtL.addClass(activeButtonEl, activeCls);
        }
    }
})();
