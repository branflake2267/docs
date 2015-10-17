# Identifying Memory Leaks

The term "memory leak" is used in many contexts.  It is often used to describe memory
growth.  Wikipedia defines a "memory leak" as such:

*"When a computer program incorrectly manages memory allocations".*

This is a reasonable definition, but it is a bit vague.

## Our Definition

For the purposes of this guide, a memory leak is defined as:

*When memory usage grows without limit after repeating a portion of code. The code must be
repeated "to exhaustion" (enough that it would be necessary to reclaim memory) and the
code must also ensure that reasonable language / framework cleanup has been performed.*

That's a bit of mouthful, so let's break down the important bits of this definition:

### Language/Framework Cleanup

Depending on the environment in which the program runs, there are typically rules regarding
actions you should take to indicate that you are finished with a certain piece of allocated
memory. In Ext JS, this is typically the destroy method, which generally cleans up DOM
elements and unbinds listeners.

In C#, the recommended pattern is the IDisposable interface. Regardless of the platform,
these conventions must be followed to allow the platform to release allocated resources.
If cleanup procedures are not followed, memory leaks will result because it is not possible
to automatically infer when resources are no longer needed.

### Repeating to exhaustion
Let's assume there is a development machine with 64Gb of free memory. A section of code is
run 5 times. By inspection, it's noted that after each run, memory usage increases 1Mb each
time and is never reclaimed.

This observation is not really indicative of a problem. The program is only using a tiny
fraction of available memory. If the code section is repeated 50,000 times and still none
of the memory is reclaimed, this would be a different result. The underlying system needs
to be sufficiently stressed so that it is forced to reclaim memory.

### Usage Grows Unboundedly
This is probably the most subtle, yet most important part of the definition. In many cases,
calling destroy or other cleanup may not free all allocated resources. In Ext JS this is
typically observed in its caches.

For example, the [[ext:Ext.ComponentQuery]] class is used to search components based on a string
selector. Internally, this string selector is transformed into a function that can be
executed on the candidate components. Constructing this function is expensive and,
oftentimes, the same query is run multiple times.  Due to this re-use, the generated function
is kept in memory. The crucial point here is that the caching mechanism is bounded.

The cache is an LRU (Least Recently Used) cache. The LRU keeps track of accesses to items
in the collection. When an item is accessed, it is pulled to the front. The LRU cache also
has a maximum size. When adding an item exceeds the maximum size, the least recently used
item is evicted from the cache. Once the maximum limit is reached, the cache normalizes.
Things of this nature remaining in memory is not problematic. It only becomes an issue when
resources are retained without limit.

### Abstraction and Garbage Collection
A developer using Ext JS is far-removed from real memory management. Worse still, tools
such as Window Task Manager or Mac Activity Monitor do not provide accurate depictions of
memory consumption. To better understand how far removed the cause and effect relationships
are, it is important to evaluate the layers of memory management.

### Allocation
+ The developer requests resources from the framework (for example, creating a component).
+ The framework requests resources from the JavaScript engine (often using operator new
or createElement, etc.).
+ The JavaScript engine requests resources from the underlying process memory manager
(typically a C++ memory allocation).
+ The underlying memory manager requests resources from the operating system. This is the
memory growth we can observe in Task Manager and Activity Monitor.

### Cleanup

1. The developer calls destroy on an Ext JS component or other resource.
1. The destroy method of the Ext JS component calls other cleanup methods, sets various
internal references to null, etc..
1. The JavaScript garbage collector later decides when to sweep over the heap and reclaim
memory. This is often deferred until new memory is requested and there is "insufficient"
free memory. The memory manager may simply decide to grow the heap again instead of
collecting garbage since growing the heap is often cheaper, especially early in the life
of the application.
1. Once the JavaScript memory manager decides to collect garbage, it has to decide if the
reclaimed memory should be retained as free memory for its future use or returned to the
underlying process heap.
1. Depending on the underlying memory manager used by the JavaScript memory manager
(typically a C++ memory manager) the free memory may be kept for future use by that process
or returned to the operating system. Only if and when we reach this point do we see any
updates in Task Manager / Activity Monitor.

Given the above, it is clear that the JavaScript developer has little control over the
big picture in regards to memory management. There are many moving parts and the real
memory management is a very small cog.

For the purpose of this guide, we will not discuss these layers further. It is sufficient
to say that the JavaScript heap and its garbage collector perform the actions they deem
appropriate and it is not possible to force them to behave in a particular fashion. The
best we can do is ensure that references are not being held by user code or by the
framework.

Ultimately, inspecting memory usage with common OS monitoring tools and observing
increases in not necessarily indicative of a "memory leak".

## Detecting Leaks

### Application Level Leaks

When applications fail to cleanup framework resources, this can cause objects to
accumulate in several collections maintained by the framework. While the exact details of
these are version-specific, some places to check are:

+ [[ext:Ext.ComponentManager]]
+ [[ext:Ext.data.StoreManager]]

### Framework Level Leaks
While every effort is made to cleanup resources internal to the framework, there is always
room for mistakes. Historically, the most common issues have come from leaking DOM
elements. If you suspect this is the case, the [sIEve](http://home.online.nl/jsrosman/)
tool provides excellent leak detection in Internet Explorer.

**Note:** We highly recommended that you address all application-level leaks before looking
at things on this lower level.

## Common Code Leak Patterns And Solutions

The following code snippets and descriptions will highlight various ways that memory is
abused in a way that may cause problems.

### Preventing Base Class Cleanup

In an effort to clean up resources in derived classes, base class cleanup may be
accidentally bypassed.

For example:

    Ext.define('Foo.bar.CustomButton', {
        extend: 'Ext.button.Button',
        onDestroy: function () {
            // do some cleanup
        }
    });

**Solution:** Be sure to call [[ext:Ext.Base#method-callParent callParent()]],
which allows the base class to perform its cleanup.

### Not removing DOM listeners

An event is attached to an element. The elements is overwritten by changing the innerHTML.
However, this event handler will remain in memory.

    Ext.fly(someElement).on('click', doSomething);

    someElement.parentNode.innerHTML = '';

**Solution:** Keep a reference to important elements and call their destroy method when they
are no longer needed.

### Keeping references to objects

An instance of a class is created that uses lots of memory. The class is destroyed, but a
reference remains on an existing object.

    Ext.define('MyClass', {

        constructor: function() {
            this.foo = new SomeLargeObject();
        },

        destroy: function() {
            this.foo.destroy();
        }
    });

    this.o = new MyClass();
    o.destroy();

    // `this` still has a reference to `o` and `o` has a reference to `foo`.

**Solution:** Set references to null to ensure memory can be reclaimed. In this case,
`this.foo = null` in destroy as well as `this.o = null` after calling destroy.

### Keeping References in Closures

This situation is more subtle, but very similar to the above. The closure holds a
reference to a large object that can't be reclaimed while the closure is still being
referenced.

    function runAsync(val) {
        var o = new SomeLargeObject();
        var x = 42;

        // other things

        return function() {
            return x;  // o is in closure scope but not needed
        }
    }

    var f = runAsync(1);

The above often occurs because the large object was present in the outer scope and not
needed by the inner function. These sorts of things are easy to miss, but can negatively
affect memory usage.

**Solution:** Use [[ext:Ext.Function-method-bind Ext.Function.bind()]] or the standard
JavaScript Function `bind` to create safe closures for functions declared outside such functions.

    function fn (x) {
        return x;
    }

    function runAsync(val) {
        var o = new SomeLargeObject();
        var x = 42;

        // other things

        return Ext.Function.bind(fn, null, [x]); // o is not captured
    }

    var f = runAsync(1);

### Continually creating instances with side effects

Creating some objects can have side effects (for example, creating DOM elements). If these
are being created without being destroyed, they can leak memory.

    {
        xtype: 'treepanel',
        listeners: {
            itemclick: function(view, record, item, index, e) {

                // Always creating and rendering a new menu
                new Ext.menu.Menu({
                    items: [record.get('name')]
                }).showAt(e.getXY());
            }
        }
    }

**Solution:** Capture a reference to the menu and call the destroy method on it when it is
no longer needed.

### Clearing any registration in a cache

It is important to remove all references to an object. Setting a local reference to null
is not enough. If some global singleton cache is holding a reference, that reference will
be held for the lifetime of the application.

    var o = new SomeLargeObject();
    someCache.register(o);

    // Destroy and null the reference. someCache still has a reference
    o.destroy();
    o = null;

**Solution:** Be sure to remove objects from any caches to which it has been added in
addition to calling destroy.

## Summary

Taking control of your application's memory management can be a simple task.  Keep your
application above reproach by destroying your unused components, nullifying unused
references, and using [[ext:Ext.Base#method-callParent callParent()]].  Following these
suggestions will ensure that your application is running smoothly and does not use
resources irresponsibly.
