const assertly = require('assertly'),
      Path     = require('path'),
      expect   = assertly.expect,
      file     = require('phylo'),
      root     = String(file.cwd().up('../')),
      Base     = require("../modules/base/"),
      product  = "extjs", version  = "6.5.0", toolkit  = "modern";

describe("Base", function() {
    const moduleToolkit  = new Base({
        _myRoot: root,
        product: product,
        version: version,
        toolkit: toolkit
    });

    const moduleNoToolkit  = new Base({
        _myRoot: root,
        product: product,
        version: version
    });

    it("should exist", function() {
        expect(moduleNoToolkit).to.not.be.empty;
    });

    describe("apiDir", function() {
        it("should return api dir with toolkit", function() {
            expect(moduleToolkit.apiDir).to.be(Path.join(root,"output",product,version,toolkit));
        });

        it("should return api dir without toolkit", function() {
            expect(moduleNoToolkit.apiDir).to.be(Path.join(root,"output",product,version,"api"));
        });
    });

    describe("apiDirName", function() {
        it("should return api dir name with toolkit", function() {
            expect(moduleToolkit.apiDirName).to.be(toolkit);
        });

        it("should return api dir name without toolkit", function() {
            expect(moduleNoToolkit.apiDirName).to.be("api");
        });
    });

    describe("directory assessment", function() {
        it("should return assets dir", function() {
            expect(moduleNoToolkit.assetsDir).to.be(Path.join(root,"output/assets"));
        });

        it("should return images dir", function() {
            expect(moduleNoToolkit.imagesDir).to.be(Path.join(root,"output/assets/images"));
        });

        it("should return js dir", function() {
            expect(moduleNoToolkit.jsDir).to.be(Path.join(root,"output/assets/js"));
        });

        it("should return css dir", function() {
            expect(moduleNoToolkit.cssDir).to.be(Path.join(root,"output/assets/css"));
        });

        it("should return resources dir", function() {
            expect(moduleNoToolkit.resourcesDir).to.be(Path.join(root,"output",product,version,"resources"));
        });

        it("should return product output dir", function() {
            expect(moduleNoToolkit.outputProductDir).to.be(Path.join(root,"output",product,version));
        });

        it("should return offline docs output dir", function() {
            expect(moduleNoToolkit.offlineDocsDir).to.be(Path.join(root,"output/downloads"));
        });
    });

    describe("cssDir", function() {
        it("should return css dir with toolkit", function() {
            expect(moduleToolkit.cssDir).to.be(Path.join(root,"{outputDir}/assets/css"));
        });

        it("should return css dir without toolkit", function() {
            expect(moduleNoToolkit.cssDir).to.be(Path.join(root,"output/assets/css"));
        });
    });

    describe("parentChain", function() {
        let parentChain = moduleNoToolkit.parentChain;

        it("should return an array", function() {
            expect(parentChain).to.be.a('array');
        });

        it("should return current module name", function() {
            expect(parentChain[0]).to.be('base');
        });
    });

    describe("markup", function() {
        it("should convert markdown to markup", function() {
            let markdown = "+ **Bold** - _italic_";

            expect(moduleToolkit.markup(markdown)).to.be("<ul>\n<li><strong>Bold</strong> - <em>italic</em></li>\n</ul>\n");
        });

        it("should properly handle html tags", function() {
            let markdown = "lorem ipsum dolar sed `<form>` and <pre>";

            expect(moduleToolkit.markup(markdown)).to.be("<p>lorem ipsum dolar sed <code>&lt;form&gt;</code> and <pre></p>\n");
        });
    });

    describe("addCls", function() {
        it("should add class to given set of elements", function() {
            let html= '<div><a href="#">Click me!</a></div>',
                converted = moduleNoToolkit.addCls(html, 'a', 'foo');

            expect(converted).to.be('<div><a href="#" class="foo">Click me!</a></div>');
        });

        it("should add classes to multiple elements", function() {
            let html= '<div><a href="#">Click me!</a><code>return a;</code></div>',
            converted = moduleNoToolkit.addCls(html, {
                a    : 'foo',
                code : 'bar'
            });

            expect(converted).to.be('<div><a href="#" class="foo">Click me!</a><code class="bar">return a;</code></div>');
        });
    });

    describe("createLink", function() {
        let link;

        it("should convert link", function() {
            link = moduleNoToolkit.createLink('foo.html', 'foo#bar');

            expect(link).to.be("<a href='foo.html'>foo#bar</a>");
        });

        it("should convert link with hashtag", function() {
            link = moduleNoToolkit.createLink('foo.html#cfg-foo', 'foo-bar');

            expect(link).to.be("<a href='foo.html#cfg-foo'>foo-bar</a>");
        });

        it("should properly handle solo hashtags", function() {
            link = moduleNoToolkit.createLink('#cfg-foo', 'foo');

            expect(link).to.be("<a href='#cfg-foo'>foo</a>");
        });

        it("should add _blank for external links", function() {
            link = moduleNoToolkit.createLink('http://google.com', 'google');

            expect(link).to.be("<a class='external-link' target='_blank' href='http://google.com.html'>google</a>");
        });

        it("should properly handle external link with hashtag", function() {
            link = moduleNoToolkit.createLink('http://google.com/index.html#foo', 'google');

            expect(link).to.be("<a class='external-link' target='_blank' href='http://google.com/index.html#foo'>google</a>");
        });
    });

    describe("makeId", function() {
        it("should not return an id with slashes or spaces", function() {
            let str  = "foo /bar",
                name = "foo bar";
            expect(moduleNoToolkit.makeID(str, name)).to.be('foo_-_-bar_-_foo_bar');
        });
    });

    describe("splitInline", function() {
        let str, join, result;

        it("should split string", function() {
            str    = 'String,Ext.grid.Panel,Ext.Component';
            join   = '<br>';
            result = moduleNoToolkit.splitInline(str, join);

            expect(result).to.be("String<br>Ext.grid.Panel<br>Ext.Component");
        });

        moduleNoToolkit.splitInline();
    });

    describe("uniqueId", function() {
        it("should create unique ids", function() {
            let a = moduleNoToolkit.uniqueId,
                b = moduleNoToolkit.uniqueId;

            expect(a).to.not.be(b);
        });
    });
});
