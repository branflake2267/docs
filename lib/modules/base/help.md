## Terms, Icons, and Labels

Many classes have shortcut names used when creating (instantiating) a class with a 
configuration object.  The shortcut name is referred to as an `alias` (or `xtype` if the 
class extends Ext.Component).  The alias/xtype is listed next to the class name of 
applicable classes for quick reference.

### Access Levels

Framework classes or their members may be specified as `private` or `protected`.  Else, 
the class / member is `public`.  `Public`, `protected`, and `private` are access 
descriptors used to convey how and when the class or class member should be used.

- **Public** classes and class members are available for use by any other class or 
application code and may be relied upon as a stable and persistent within major product 
versions.  Public classes and members may safely be extended via a subclass.

- **Protected** class members are stable `public` members intended to be used by the 
owning class or its subclasses.  Protected members may safely be extended via a subclass.

- **Private** classes and class members are used internally by the framework and are not 
intended to be used by application developers.  Private classes and members may change or 
be omitted from the framework at any time without notice and should not be relied upon in 
application logic.

### Member Types

- **Config** - The configuration options for a class.
- **Property** - Set once a class is instantiated. *See Read Only below.
- **Method** - Actions that can be performed by a class.  Methods should be read as 
instance methods and can only be called from a instance of a given class.  Static methods 
that can be called directly from the class itself will have a `static` label next to the 
method name.  *See Static below.
- **Event** - Events are specific to the framework event system allowing for classes to 
programmatically raise an event to be handled by one or more event handler methods.  DOM 
events, while handled by the framework event system, are not specifically described 
within the API documentation.  *For DOM events refer to the 
[event reference](https://developer.mozilla.org/en-US/docs/Web/Events) page from MDN.
- **Theme Variable** - Variables used by the visual theme engine employed by the 
framework.
- **Theme Mixin** - Functions used by the visual theme engine employed by the framework 
and may use values set in various Theme Variables.

### Member Syntax

Below is an example class member that we can disect to show the syntax of a class member 
(the lookupComponent method as viewed from the Ext.button.Button class in this case).

<div style="position: relative;" class="show-inherited show-protected members">
    <div style="border: 1px solid #E4E4E4;" class="classmembers member-protected isNotStatic isInherited member-temp-expanded" data-member-name="lookupComponent">
        <div class="collapse-toggle"></div>
        <div class="source-class"><a href="javascript:void(0);">Ext.container.Container</a><div class="viewSource"><a href="javascript:void(0);"></a><a target="_blank" href="javascript:void(0);">view source</a></div></div>
        <div class="member-header">
        <a href="javascript:void(0);" class="member-name-link"><span data-ref="method-lookupComponent" class="member-name"><strong>lookup</strong>Component</span></a>
        <span class="params-list"> ( item )</span> : <span class="memberType">Ext.Component</span>
        <div class="member-tags"><span class="protected">protected</span></div>
    </div>
        <p>Called when a raw config object is added to this container either during initialization of the <a href="javascript:void(0);">items</a> config,
    or when new items are <a href="javascript:void(0);">added), or {@link #insert inserted</a>.</p>
    <p>This method converts the passed object into an instanced child component.</p>
    <p>This may be overridden in subclasses when special processing needs to be applied to child creation.</p>
                <div class="detail-header">Parameters</div>
            <p><span class="params-list">item</span> :
                    <span class="memberType">&nbsp;Object</span>
            </p>
            <div class="params-desc"><p>The config object being added.</p></div>
            <div class="detail-header">Returns</div>
            <span style="margin-left:12px;" class="memberType">Ext.Component</span>
            <div class="return-desc"><p>The component to be added.</p>
        </div>
    </div>
</div>

Let's look at each part of the member row:

- **Expand/Collapse** - On the left-hand size of the member row is a control used to 
expand and collapse each member row to show / hide member details.
- **Member Name** - The name of the class member (`lookupComponent` in this example)
- **Method Param** - Any required or optional params used by a method (or passed to an 
event handler method) will be listed next to the method name within parenthesis 
(`( item )` in this example)
- **Return type** - The class instance or javascript object returned by the method or 
property (`Ext.Component` in this case).  This may be omitted for methods that do not 
return anything other than `undefined` or may display as multiple possible values 
separated by a forward slash `/` signifying that what is returned may depend on the 
results of the method call (i.e. a method may return a Component if a get method calls is 
successful or `false` if unsuccessful which would be displayed as 
`Ext.Component/Boolean`).
- **Flags** - Any flags applicable to the member will be displayed next (`PROTECTED` in 
this example - see the Flags section below)
- **Member Origin** - On the right-hand side of the member row is the class where the 
member was initially described (`Ext.container.Container` in this example).  The source 
class will be displayed as a blue link if the member originates from the current class 
and gray if it is inherited from an ancestor or mixed-in class.
- **Member Source** - On the right-hand side below the member origin class is a link to 
view the member's source (`view source` in the example)
- **Params List** - Each param for a class method will be listed using the same name 
found above in parenthesis, the type of class or object expected, and a description of 
the param (`item : Object` in the example).
- **Returns** - If a class returns a value other than `undefined` a "Returns" section 
will note the type of class or object returned and a description (`Ext.Component` in the 
example)
- **Since** (*not shown in the example*) - Some members will show which version of the 
product the member was first introduced (i.e. `Available since 3.4.0` - *not pictured in 
the example*) just after the member description
- **Default** (*not shown in the example*) - Configs often show the default config value 
to be applied to a class instance if not overridden (i.e. `Defaults to: false`)

### Member Flags

The API documentation uses a number of flags to further commnicate the class member's 
function and intent.  The label may be represented by a text label, an abbreviation, or 
an icon.

- **Required** - Required config when instantiating a class
- **Bindable** - The config has a setter which allows this config to be set via ViewModel 
binding
- **Read Only** - The property may be read, but cannot be used to configure / 
re-configure a class instance at runtime
- **Singleton** - Singleton classes are instantiated immediately once defined and may not 
be instantiated manually
- **Static** - A static method or property is a method or property belonging to the class 
itself, not an instance of the class
- **Chainable** - Refers to methods that return the class instance back when called.  
This enables chained method calls like: `classInstance.method1().method2().etc();`
- **Deprecated** - A class or member that is scheduled for removal in a future 
framework version and is provided in the current version for backwards compatibility.  
Deprecated classes and members will have a message directing you to the preferred class / 
method going forward.
- **Removed** - A removed class or member that exists in documentation only as a 
reference for users upgrading between framework versions
- **Template** - A method defined within a base class designed to be overridden by 
subclasses
- **Abstract** - A class or member may be be defined as abstract.  Abstract classes and 
members establish a class structure and provide limited, if any, code.  Class-specific 
code will be furnished via overrides in subclasses.
- **Preventable** - Events marked preventable will not fire if `false` is returned from 
an event handler

### Class Icons

<span class="icon-demo class-icon"></span> - Indicates a framework class  

<span class="icon-demo singleton-icon"></span> - A singleton framework class. *See the 
singleton flag for more information  

<span class="icon-demo component-icon"></span> - A component-type framework class (any 
class within the Ext JS framework that extends Ext.Component)  

<span class="icon-demo display-new"></span> - Indicates that the class, member, or guide 
is new in the currently viewed version


### Member Icons

<span class="icon-demo fa fa-cubes"></span> - Indicates a class member of type `config`  

<span class="icon-demo fa fa-book"></span> - Indicates a class member of type `property`  

<span class="icon-demo fa fa-object-group"></span> - Indicates a class member of type 
`method`  

<span class="icon-demo fa fa-bolt"></span> - Indicates a class member of type `event`  

<span class="icon-demo fa fa-paint-brush"></span> - Indicates a class member of type 
`theme variable`  

<span class="icon-demo fa fa-tint"></span> - Indicates a class member of type 
`theme mixin`  

<span class="icon-demo display-new"></span> - Indicates that the class, member, or guide 
is new in the currently viewed version

## Navigation and Features

### Class Member Quick-Nav Menu

Just below the class name on an API doc page is a row of buttons corresponding to the 
types of members owned by the current class.  Each button shows a count of members by 
type (this count is updated as filters are applied).  Clicking the button will navigate 
you to that member section.  Hovering over the member-type button will reveal a popup 
menu of all members of that type for quick navigation.

### Getter and Setter Methods

Getting and setter methods that correlate to a class config option will show up in the 
methods section as well as in the configs section of both the API doc and the member-type 
menus just beneath the config they work with.  The getter and setter method documentation 
will be found in the config row for easy reference.

### Search and Filters

Both API docs and guides can be searched for using the search field at the top of the 
page.

On API doc pages there is also a filter input field that filters the member rows 
using the filter string.  In addition to filtering by string you can filter the class 
members by access level and inheritance.  This is done using the checkboxes at the top of 
the page.  **Note** that filtering out `private` members also filters the API class 
navigation tree.

### API Doc Class Metadata

Each API doc page (with the exception of Javascript primitives pages) has a menu view of 
metadata relating to that class.  This metadata view will have one or more of the 
following:

- **Alternate Name** - One or more additional class name synonymns (in Ext JS 6.0.0 the 
`Ext.button.Button` class has an alternate class name of `Ext.Button`).  Alternate class 
names are commonly maintained for backward compatibility.
- **Hierarchy** - The hierararchy view lists the inheritance chain of the current class 
up through its ancestor classes up to the root base class.
- **Mixins** - A list of classes that are mixed into the current class
- **Inherited Mixins** - A list of classes that are mixed into an ancestor of the current 
class
- **Requires** - All classes required to be defined for the class to be instantiated
- **Uses** - A list of classes potentially used by the class at some point in its 
lifecycle, but not necessarily requried for the class to initially be instantiated
- **Subclasses** - Classes that extend the current class

### Expanding and Collapsing Examples and Class Members

Runnable examples (Fiddles) are expanded on a page by default.  You can collapse and 
expand example code blocks individually using the arrow on the top-left of the code 
block.  You can also toggle the collapse state of all examples using the toggle button on 
the top-right of the page.  The toggle-all state will be remembered between page loads.

Class members are collapsed on a page by default.  You can expand and collapse members 
using the arrow icon on the left of the member row or globally using the expand / 
collapse all toggle button top-right.

### Desktop -vs- Mobile View

Viewing the docs on narrower screens or browsers will result in a view optimized for a 
smaller form factor.  The primary differences between the desktop and "mobile" view are:

- Global navigation will be located in a menu on the left-hand side accessible via the 
hamburger menu icon.  The menu houses the following (on most pages):
    - The name of the current product (as a link to the product landing page)
    - The Sencha icon used to navigate back to the documentation home page
    - The product menu drop-down button
    - Tabs of navigation trees for the API docs and guides
- Current context navigation and tools is located on the right-hand side accessible via 
the gear icon.  The context menu houses teh following:
    - The global search input field
    - (*API doc*) A "Filters" tab with the member filter, expand / collapse all examples 
    button, expand / collapse all member rows button, the access level filter checkboxes, 
    and the counts of each member
    - (*API doc*) A "Related Classes" tab containing the menu of metadata related to the 
    current class
    - (*Guides*) The table of contents for the guide

### Viewing the Class Source

The class source can be viewed by clicking on the class name at the top of an API doc 
page.  The source for class members can be viewed by clicking on the "view source" link 
on the right-hand side of the member row.