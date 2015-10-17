# Using Events

The Components and Classes of Ext JS fire a broad range of events at various points
in their lifecycle. Events allow your code to react to changes around your application.
They are a key concept within Ext JS.

## What Are Events?

Events fire whenever something interesting happens to one of your Classes.
For example, when [[ext:Ext.Component]] renders to the screen, Ext JS fires an
event after the render completes. We can listen for that event
by configuring a simple `listeners` object:

    @example
    Ext.create('Ext.Panel', {
        html: 'My Panel',
        renderTo: Ext.getBody(),
        listeners: {
            afterrender: function() {
                Ext.Msg.alert('We have been rendered');
            }
        }
    });

In this example, when you click the <b>Preview</b> button, the Panel
renders to the screen, followed by the defined alert message. All events
fired by a class are listed in the class's API page - for example,
[[ext:Ext.panel.Panel]] currently has 45 events.

## Listening to Events

While [[ext:Ext.Component-event-afterrender]] is useful in some cases, you may use other
events
more frequently. For instance, [[ext:Ext.button.Button]] fires click events
when clicked:

    @example
    Ext.create('Ext.Button', {
        text: 'Click Me',
        renderTo: Ext.getBody(),
        listeners: {
            click: function() {
                Ext.Msg.alert('I was clicked!');
            }
        }
    });

A component may contain as many event listeners as needed. In the following example,
we confound users by calling `this.hide()` inside our mouseover
listener to hide a Button. We then display the button again a second later.
When `this.hide()` is called, the Button is hidden and the `hide`
event fires. The hide event triggers our `hide` listener,
which waits one second and displays the Button again:

    @example
    Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'My Button',
        listeners: {
            mouseover: function() {
                this.hide();
            },
            hide: function() {
                // Waits 1 second (1000ms), then shows the button again
                Ext.defer(function() {
                    this.show();
                }, 1000, this);
            }
        }
     });

Event listeners are called every time an event is fired, so you can continue hiding and
showing the button for as long as you desire.

## Adding Listeners Later

In previous examples, we passed listeners to the component when the class was
instantiated.
However, If we already have an instance, we can add listeners using the `on`
function:

    @example
    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'My Button'
    });

    button.on('click', function() {
        Ext.Msg.alert('Event listener attached by .on');
    });

You can also specify multiple listeners by using the `.on` method,
similar to using a listener configuration.  The following revisits
the previous example that set the button's visibility with a mouseover event:

    @example
    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'My Button'
    });

    button.on({
        mouseover: function() {
            this.hide();
        },
        hide: function() {
            Ext.defer(function() {
                this.show();
            }, 1000, this);
        }
    });

## Removing Listeners

Just as we can add listeners at any time, we can also remove them. This time we use
the `un` function. To remove a listener, we need a reference to its function.
In the previous examples, we passed a function into the listener's
object or the `on` call. This time, we create the function earlier and link
it into a variable called `doSomething`, which contains our custom function.
Since we initially pass the new `doSomething` function into our listeners
object, the code begins as before. With the eventual addition of
an [[ext:Ext-method-defer]] function, clicking the button in the first
3 seconds yields an alert message. However, after 3
seconds the listener is removed so nothing happens:

    @example
    var doSomething = function() {
        Ext.Msg.alert('listener called');
    };

    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'My Button',
        listeners: {
            click: doSomething,
        }
    });

    Ext.defer(function() {
        button.un('click', doSomething);
    }, 3000);

## Scope Listener Option

Scope sets the value of this inside your handler function. By default, this is set to the
instance of the class firing the event.  This is often, but not always, the functionality
that you want. This functionality allows us to
call `this.hide()` to hide the button in the
second example earlier in this guide.
In the following example, we create a Button and a Panel.  We then listen to the Button's
click event with the handler running in Panel's scope. In order to do this, we need to
pass in an object instead of a handler function.  This object contains the function AND
the scope:

    @example
    var panel = Ext.create('Ext.Panel', {
        html: 'Panel HTML'
    });

    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'Click Me'
    });

    button.on({
        click: {
            scope: panel,
            fn: function() {
                Ext.Msg.alert(this.getXType());
            }
        }
    });

When you run this example, the value of the click handler's `this` is a reference to the
Panel. To see
this illustrated, we alert the `xtype` of the scoped component. When the button is
clicked,
we should see the Panel `xtype` being alerted.

## Listening to an Event Once

You may want to listen to one event only once. The event itself might fire any number of
times, but we only want to listen to it once. The following codes illustrates this
situation:

    @example
    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'Click Me',
        listeners: {
            click: {
                single: true,
                fn: function() {
                    Ext.Msg.alert('I will say this only once');
                }
            }
        }
    });

## Using a Buffer Configuration

For events that fire many times in short succession, we can reduce the number of times our

listener is called by using a buffer configuration. In this case our button's click
listener is only invoked once every 2 seconds, regardless of how many times you click it:

    @example
    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: 'Click Me',
        listeners: {
            click: {
                buffer: 2000,
                fn: function() {
                    Ext.Msg.alert('I say this only once every 2 seconds');
                }
            }
        }
    });

## Firing Custom Events

Firing your own events is done by calling `fireEvent` with
an event name. In the following example we fire an event called myEvent that passes two
arguments - the button itself and
a random number between 1 and 100:

    @example
    var button = Ext.create('Ext.Button', {
        renderTo: Ext.getBody(),
        text: "Just wait 2 seconds",
        listeners: {
            myEvent: function(button, points) {
                Ext.Msg.alert('myEvent fired! You score ' + points + ' points');
            }
        }
    });

    Ext.defer(function() {
        var number = Math.ceil(Math.random() * 100);

        button.fireEvent('myEvent', button, number);
    }, 2000);

Once again we used `Ext.defer` to delay the function that
fires our custom event, this time
by 2 seconds. When the event fires, the `myEvent` listener
picks up on it and displays the arguments we passed in.

##Listening for DOM Events

Not every ExtJS component raises every event.  However, by targeting the container's
element, we can attach many native events to which the component can then listen. In this
example, we target [[ext:Ext.container.Container]].  Containers do not have a click event.  Let's
give it one!

    @example
    var container = Ext.create('Ext.Container', {
        renderTo: Ext.getBody(),
        html: 'Click Me!',
        listeners: {
            click: function(){
                Ext.Msg.alert('I have been clicked!')
            }
        }
    });

    container.getEl().on('click', function(){
        this.fireEvent('click', container);
    }, container);

Without the second block of code, the container's click listener would not fire.  Since we
have targeted the container's element and attached a click listener, we have extended the
container's event capabilities.

##Event Normalization

Event normalization is the key to allowing Ext JS 5+ applications to run on touch-screen
devices. This normalization occurs behind the scenes and is a simple translation from
standard mouse events to their equivalent touch and pointer events.

Pointer events are a w3c standard for dealing with events that target a specific set of
coordinates on the screen, regardless of input device (mouse, touch, stylus, etc.)

When your code requests a listener for a mouse event, the framework attaches a similar
touch or pointer event as needed. For example, if the application attempts to attach a
mousedown listener:

    myElement.on('mousedown', someFunction);

The event system translates this to touchstart in the case of a device that supports touch
events:

    myElement.on('touchstart', someFunction);

Or, pointerdown in the case of a device that supports pointer events:

    myElement.on('pointerdown', someFunction);

This translation is in place so that you may achieve tablet and touch-screen support
without any additional coding.

In most cases the framework can transition seamlessly between mouse, touch, and pointer
input. However, there are a few mouse interactions (such as mouseover) that do not
translate easily into touch interactions. Such events will need to be handled on an
individual basis and are addressed in a following section.

##Gestures

In addition to standard DOM events, Elements also fire synthesized "gesture" events. Since
the Sencha Touch event system forms the basis for the Event System, Sencha
Touch users may already be familiar with this concept.

From a browser's perspective, there are 3 primary types of pointer, touch, and mouse
events - start, move, and end:

<table>
    <tr>
        <th>Event</th>
        <th>Touch</th>
        <th>Pointer</th>
        <th>Mouse</th>
    </tr>
    <tr>
        <th>Start</th>
        <td>touchstart</td>
        <td>pointerdown</td>
        <td>mousedown</td>
    </tr>
    <tr>
        <th>Move</th>
        <td>touchmove</td>
        <td>pointermove</td>
        <td>mousemove</td>
    </tr>
    <tr>
        <th>Stop</th>
        <td>touchend</td>
        <td>pointerup</td>
        <td></td>
    </tr>
</table>

Upon interpreting the sequence and timing of these events, the framework can synthesize
more complex events such as `drag`, `swipe`, `longpress`, `pinch`, `rotate`, and `tap`.
Ext JS applications can listen for gesture events just like any other event, for example:

    Ext.get('myElement').on('longpress', handlerFunction);

The original Sencha Touch gesture system was designed primarily with touch events in mind.
By adding full support for pointer and mouse events to the Gesture system, Ext JS 5 allows
any gesture to respond to any type of input. This means not only that all gestures can be
triggered using touch input, but all single-point gestures (tap, swipe, etc.) can be
triggered using a mouse as well. This results in a gesture system that works seamlessly
across devices regardless of input type.
