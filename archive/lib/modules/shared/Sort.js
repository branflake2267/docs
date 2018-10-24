'use strict';

/**
 * Sort an array of object with multiple sort fields.
 *
 * @cfg {Array} sorters An array of sorters. Each sorter may be a string or an object.
 *
 *     new Sort([
 *         'foo' //will sort foo by ASC
 *     ]);
 *
 *     new Sort([
 *         'foo',
 *         { property : 'bar', direction : 'DESC' }
 *     ]);
 */

class Sort {
    constructor (sorters) {
        this.sorters = sorters;
    }

    static defaultFn (a, b) {
        if (a == b) {
            return 0;
        }

        return a < b ? -1 : 1;
    }

    /**
     * Runs the actual sorting when you pass it an array.
     *
     *     var sorter = new Sort([
     *         'foo',
     *         { property : 'bar', direction : 'DESC' }
     *     ]);
     *
     *     sorter.sort([
     *         { foo : 'Dudes',  bar : 'Seth'  },
     *         { foo : 'Dudes',  bar : 'Greg'  },
     *         { foo : 'Dudes',  bar : 'Mitch' },
     *         { foo : 'Chicks', bar : 'Pat'    }
     *     ]);
     *
     * This will result in this order:
     *
     *     [
     *         { foo : 'Chicks', bar : 'Pat'   },
     *         { foo : 'Dudes',  bar : 'Seth'  },
     *         { foo : 'Dudes',  bar : 'Mitch' },
     *         { foo : 'Dudes',  bar : 'Greg'  },
     *     ]
     *
     * @cfg {Array} arr An array of items to be sorted.
     */
    sort (arr) {
        return arr.sort(this.createFn(this.sorters));
    }

    createFn (sorters) {
        let me     = this,
            fields = [],
            property, fn;

        sorters.forEach(function(field) {
            if (typeof field === 'string') {
                property = field;
                fn       = Sort.defaultFn;
            } else {
                property = field.property;
                fn       = me.getFn(field.direction);
            }

            fields.push({
                property : property,
                fn       : fn
            });
        });

        return function(A, B) {
            let i      = 0,
                length = sorters.length,
                field, property, result,
                a, b;

            for (; i < length; i++) {
                field    = fields[i];
                property = field.property;
                a        = A[property];
                b        = B[property];

                if (typeof a === 'string') {
                    a = a.toLowerCase();
                }
                if (typeof b === 'string') {
                    b = b.toLowerCase();
                }


                result   = field.fn(a, b);

                if (result !== 0) {
                    break;
                }
            }

            return result;
        }
    }

    getFn (direction) {
        let fn = Sort.defaultFn;

        if (direction === 'DESC') {
            return function(a, b) {
                return -1 * fn(a, b);
            };
        }

        return fn;
    }
}

module.exports = Sort;
