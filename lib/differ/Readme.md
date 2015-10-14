Differ
===

This node project is to find differences between two different versions. This is
written in vanilla JavaScript (except the filesystem writing) as this may be
shared with the docs app in the browser.

This requires the `argv` node module. You can install it locally via:

    cd lib/differ
    npm install

To run:

    node index ./json/current/classic-all-classes.json ./json/old/classic-all-classes.json --new=6.0.1 --old=6.0.0 --output=./output

For reference, here are two current diffs from old tool:

[5.1.1 to 6.0.0](https://github.com/sencha/sencha-documentation/blob/master/markdown/src/main/markdown/extjs/6.0/api_diffs/600_classic_diff.md)

[6.0.0 to 6.0.1](https://github.com/sencha/sencha-documentation/blob/master/markdown/src/main/markdown/extjs/6.0/api_diffs/601_classic_diff.md)
