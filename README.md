Visual Regression Testing for Nightwatch
========================================

This is a NightwatchJS custom assertion and commands for capturing and comparing screenshots during testing.

Node dependencies are listed in `package.json`.

This project uses the `gm` module, and so requires that graphicsmagick or imagemagick are installed and configured on your system.

Description
-----------

The first time the assertion is run, a baseline image is saved.

Subsequent runs will compare to these baseline images.  If the mismatch percentage is more than the given threshold, the assertion fails.  

When the assertion fails, the visual diff is copied to a separate folder.

Generated folders and images are organized in this way:
`testPath/testName/browser_version_os/widthxheight/testLabel__selector--label.png`


Installation
------------

* Install graphicsMagick (preferred) or imageMagick
* Update your dependencies with those from package.json (or otherwise make sure they are included) and install
* Copy the contents of `assertions` and `commands` to the corresponding folders in your nightwatchJS configuration or otherwise point to them in your nightwatch configuration (nightwatch.json)
* Update your globals file with the configuration from globals.js (see the _Configuration_ section)


Configuration
-------------

Copy the contenst of `globals.js` into the file specified by `globals_path` in `nightwatch.json`

See `globals.js` for configuration details.


Usage
-----

````
module.exports = {
    'My Test':  function(client){
        var page = client.page['myPage']();

        page.navigate();

        // Screenshot cropped to default selector
        client.assert.visualRegression();

        // Screenshot cropped to contents of given selector
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
