module.exports = {
    getMatch : function(key, value, arr) {
        var match;

        if (arr) {
            arr.forEach(function(item) {
                if (!match && item[key] === value) {
                    match = item;
                }
            });
        }

        return match;
    }
};
