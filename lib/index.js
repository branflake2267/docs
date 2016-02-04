'use strict';

const debug   = require('./Debug');
const modules = [
    'app-parser',
    'class-tree',
    'diff',
    'guide-parser',
    'json-parser',
    'source-parser',
    'member-info'
];

//enable the logger but disable the log level, info and error will still show
debug.enable();
debug.disable('log');

require('./init')(modules);
