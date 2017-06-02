describe("Product Menu", function() {
    beforeAll(function() {
        ST.setViewportSize(1024, 768);    
    });

    
    it("should open product menu", function() {
        var button = ST.element('#properties-nav-btn')
        button.click();
    });
});