(function() {
    if (!document.getElementsByClassName('classMeta')[0].innerHTML.trim()) {
        document.getElementsByClassName('classMeta')[0].style.display = 'none';
        document.getElementsByClassName('classMetaHeader')[0].style.display = 'none';
    }

    document.getElementById('box').onkeyup = function() {
        var value        = this.value,
            matcher      = new RegExp(value, 'gi'),
            classmembers = document.getElementsByClassName('classmembers'),
            i            = 0,
            length       = classmembers.length;

        if (value.trim()) {
            ExtL.addClass(document.body, 'filtered');
        } else {
            ExtL.removeClass(document.body, 'filtered');
        }

        for (; i < length; i++) {
            classmembers[i].style.display = matcher.test(classmembers[i].getAttribute('data-member-name')) ? 'block' : 'none';
        }
    };

    if (ExtL.treeData) {
        new TreeView(ExtL.treeData, 'tree');
    }

    window.onscroll = function(e) {
        var vertical_position = 0;

        if (pageYOffset) {
            vertical_position = pageYOffset;
        } else if (document.documentElement.clientHeight) { //ie
            vertical_position = document.documentElement.scrollTop;
        } else if (document.body) { //ie quirks
            vertical_position = document.body.scrollTop;
        }

        if (vertical_position > 345) {
            ExtL.addClass(document.body, 'sticky');
        } else {
            ExtL.removeClass(document.body, 'sticky');
        }
    };

})();
