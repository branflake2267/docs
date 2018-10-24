describe("Product Menu", function() {
    var productButton, productMenu, productItem, productVersionTree;

    beforeEach(function () {
        ST.setViewportSize(1024, 768);
        productButton = ST.element('.product-menu-btn-wrap > span.product-menu-btn');
        productMenu = ST.element('#product-tree-ct');
        productItem = ST.element('#product-menu-extreact');
        productVersionTree = ST.element('#product-version-tree-ct');
    });

    afterEach(function () {
        productButton = productMenu = productItem = productVersionTree = null;
    });

    describe('Product Menu', function () {
        beforeEach(function () {
            // open the product menu for each test
            productButton.click();
        });

        afterEach(function () {
            // close the product menu for each test
            productButton.click();
        });

        it('should open menu when clicking product button', function() {
            productMenu.visible();
        });

        it('should open sub-menu when hovering on product menu item', function () {
            // play a mouseenter event
            ST.play([{
                target: '#product-menu-extreact', type: 'mouseenter'
            }]);
            // assert that product sub-tree is visible
            productVersionTree.visible();

        });

        it('should display correct sub-menu content when hovering on product menu item', function () {
            // play a mouseenter event
            ST.play([{
                target: '#product-menu-extreact', type: 'mouseenter'
            }]);
            // assert that the heading has the correct text
            productVersionTree.down('h1').text('ExtReact');
        });
    });
});
