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
    };

    document.getElementById('box').onkeyup = function() {
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
    };

    var checkList = document.getElementById('showlist'),
        items = document.getElementById('checkeditems');

    checkList.getElementsByClassName('anchor')[0].onclick = function (evt) {
        if (checkList.classList.contains('visible')) {
            checkList.classList.remove('visible');
            items.style.display = "none";
        } else {
            checkList.classList.add('visible');
            items.style.display = "block";
        }
    }

    checkList.onblur = function(evt) {
        checkList.classList.remove('visible');
    }

    if (ExtL.treeData) {
        new TreeView(ExtL.treeData, 'tree');
    }

    window.onscroll = function(e) {
        var vertical_position = 0,
            scrollToTop = document.getElementById('back-to-top');

        if (pageYOffset) {
            vertical_position = pageYOffset;
        } else if (document.documentElement.clientHeight) { //ie
            vertical_position = document.documentElement.scrollTop;
        } else if (document.body) { //ie quirks
            vertical_position = document.body.scrollTop;
        }

        if (vertical_position > 345) {
            scrollToTop.style.display = "block";
            ExtL.addClass(document.body, 'sticky');
        } else {
            scrollToTop.style.display = "none";
            ExtL.removeClass(document.body, 'sticky');
        }
    };
})();
