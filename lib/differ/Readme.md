Differ
===

This node project is to find differences between two different versions. This is
written in vanilla JavaScript (except the filesystem writing) as this may be
shared with the docs app in the browser.

To run:

    node index

Within `index.js`, it executes an all test. There is also a test where you can
run this only against an array of classes, used this for testing so I didn't
have to run against a 155MB file. I will be having this work based on command
line arguments of two files and their versions but current status is via
hand coding in `index.js`.

Currently, the `data` directory holds the two files. There are `current` and `old`
directories to hold the different versions. When run, it will create files in
an `output` directory in markdown.

For reference, here are two current diffs from old tool:

[5.1.1 to 6.0.0](https://github.com/sencha/sencha-documentation/blob/master/markdown/src/main/markdown/extjs/6.0/api_diffs/600_classic_diff.md)

[6.0.0 to 6.0.1](https://github.com/sencha/sencha-documentation/blob/master/markdown/src/main/markdown/extjs/6.0/api_diffs/601_classic_diff.md)
