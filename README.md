#Visual Regression Testing for Nightwatch

This is a NightwatchJS custom assertion and commands for
capturing and comparing screenshots during testing.

This is only a preliminary version.
More refinements and documention will follow.

Node dependencies are listed in `package.json`.

This project uses the `gm` module, and so requires that
graphicsmagick or imagemagick are installed and configured on your system.

##Usage:

````
module.exports = {
    'My Test':  function(client){
        var page = client.page['myPage']();

        page.navigate();

        // Screenshot default selector
        client.assert.visualRegression();

        // Screenshot default selector
        client.assert.visualRegression('.my-component');

        // Use page selector
        page.assert.visualRegression('@myForm');

        page.click('@button');

        // Add a custom label to discern identical screenshots
        page.assert.visualRegression('@myForm', 'afterButtonPress')

        // Hide Sensitive/Dynamic content from screenshot
        page.hide('@username', function(){
            client.assert.visualRegression();
            form.show('@username');
        });
    }
};
````