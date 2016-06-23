var util     = require('util');
var fse      = require('fs-extra');
var path     = require('path');
var resemble = require('node-resemble-js');

/**
 * @typedef {Object} Coordinates
 * @property {Number} x
 * @property {Number} y
 */

/**
 * @typedef {Object} Dimensions
 * @property {Number} width
 * @property {Number} height
 */

/**
 * Crops the screenshot to the bounding box of the given element
 * Note: This uses gm, which requires that you install graphicsMagick or imageMagick
 * @see https://www.npmjs.com/package/gm
 * @param  {String}      file   Path and filename of the screenshot to crop
 * @param  {Coordinates} origin Coordinates of upper-left corner of area to crop
 * @param  {Dimensions}  size   2-D Dimensions of the area to crop
 * @param  {Function}    cb     Callback invoked when the process is finished
 * @return {Object}             Returns 'this' to allow chaining
 */
var cropElement = function(file, origin, size, cb) {
    var gm = require('gm');
    var self = this;

    // Crop the screenshot to desired element
    gm(file)
        .crop(size.width, size.height, origin.x, origin.y)
        .write(file, function(err){
            // All Operations Finished, trigger callback
            if( typeof cb === "function" ){
                cb.call(self);
            }

            if (err) {
                console.log('Failure cropping screenshot');
                console.log(err);
            }
        })
    ;

    return this;
};


/**
 * Compares a screenshot to a preconfigured baseline
 * If the baseline doesn't exist, the current image is copied to the baseline
 * and the tests will pass
 * @param  {String}   screenshotFile Path and file of the new screenshot
 * @param  {Function} callback       Callback invoked when processing finishes
 * @return {Object}                  Return 'this' to allow chaining
 */
var compareToBaseline = function(screenshotFile, callback){
    var options       = this.globals.visualRegression;
    var diffFile      = screenshotFile.replace(/(\.[a-zA-Z0-9]+)$/, '.diff$1');
    var baseFilename  = path.join(options.baselineFolder,  screenshotFile);
    var newFilename   = path.join(options.currentFolder,   screenshotFile);
    var diffFilename  = path.join(options.currentFolder,   diffFile);
    var errorFilename = path.join(options.errorFolder,     diffFile);

    var fNew;
    var fBase;
    var fDiff;

    var statBase;

    // fs.exists is deprecated, so we need to check file existance this way...
    try {
        statBase = fse.statSync(baseFilename);
    } catch(e) {
        // Baseline doesn't exist, new screenshot is baseline
        fse.copySync(newFilename, baseFilename);
    }

    try {
        fNew  = fse.readFileSync(newFilename);
        fBase = fse.readFileSync(baseFilename);

        resemble(fNew)
            .compareTo(fBase)
            .ignoreAntialiasing()
            .onComplete(function(data){
                // Write diff file
                fse.ensureFileSync(diffFilename);
                data.getDiffImage().pack().pipe(fse.createWriteStream(diffFilename));

                try {
                    // Remove previous error file, if it exists
                    fse.removeSync(errorFilename);
                } catch(e) {
                    //nothing
                }

                // Save a reference to the relative screenshot path for later use
                data.screenshotFile = screenshotFile;

                // Call callback
                callback.call(this, data);
            }
        );
    } catch(e) {
        console.log('Failure during screenshot comparisson');
        console.log(e);
    }

    return this;
};


/**
 * This assertion compares a screenshot to a baseline
 * If the mismatch percentage is greater than the predefined tolerance, it fails
 * Failures are moved to a separate folder for easier reference
 * @param  {String} [selector] Optionally crop the screenshot down to this element
 * @param  {String} [label]    Optional label to add to the filename
 * @param  {String} [msg]      Optionally override the assertion output message
 * @return {Object}            Return 'this' for chaining
 */
exports.assertion = function(selector, label, msg) {
    var options    = this.api.globals.visualRegression;
    var selElement = selector || options.defaultSelector;

    // If the selector comes from a section of a page object
    // selector will be an array of objects starting from the outermost
    // ancestor (section), and ending with the element
    // Join their selectors in order
    if( selector && typeof selector !== 'string' ){
        selElement = '';

        for( var i = 0; i < selector.length; i++ ){
            oElement = selector[i];
            selElement += ' ' + oElement.selector;
        }
    }

    // Separate the screenshots by client
    var filepath   = path.join(
        this.api.currentTest.module,           // Test Name
        [
            this.api.capabilities.browserName, // Browser
            this.api.capabilities.version,     // Browser Version
            this.api.capabilities.platform     // OS
        ].join('_')
    );

    // Generate a filename unique to this test/element combination
    var filename   = this.api.currentTest.name +             // Test Step
                     (selElement ? '__' + selElement.replace(/\W+/g, '_') : '') + // Element
                     (label      ? '--' + label      : '') + // Custom Label
                     '.png'                                  // Extension
    ;

    this.expected = options.mismatchTolerance;
    this.message  = msg || util.format('Visual Regression: "%s" change is less than %s%', selElement, this.expected);

    this.pass = function(value) {
        // Mismatch percentage is within tolerance
        return value < this.expected;
    };

    this.failure = function(result) {
        var failed        = !result || !this.pass( this.value(result) );
        var diffFile      = result.screenshotFile.replace(/(\.[a-zA-Z0-9]+)$/, '.diff$1');
        var errorFilename = path.join(options.errorFolder, diffFile);

        // On a failure, save the diff file to the error folder
        if( failed && result ){
            // Already packed earlier, when diff file written
            try {
                fse.ensureFileSync(errorFilename);
                result.getDiffImage().pipe(fse.createWriteStream(errorFilename));
            } catch(e) {
                console.log(e);
            }

            this.message = util.format('Visual Regression: Screen differs by %s% (see: %s)', this.value(result), errorFilename);
        }

        return failed;
    };

    this.value = function(result) {
        // Return mismatch percentage
        return result.misMatchPercentage;
    };

    this.command = function(callback) {
        // Get handle of active window
        // Needed to get window size
        this.api.windowHandle(function(response){
            var wHandle = response.value;

            // Get size of active window
            // Note we need to drop 'this.api' and use just 'this'
            this.windowSize(wHandle, function(response){
                var wSize       = response.value;
                var wDimensions = wSize.width + 'x' + wSize.height;
                var file;

                // Join the final piece of the path (dimensions) to create
                // the full file pathname relative to the base folder
                file = path.join( filepath, wDimensions, filename );

                // For capture/crop, work in the 'new' folder
                // For compare, only pass the relative portion of the filename
                if( selElement ){

                    // This was failing called within the saveScreenshot callback, so moved here
                    this.getLocation(selector||selElement, function(results){
                        var origin = results.value;

                        this.getElementSize(selector || selElement, function(results){
                            // Get width and height of the element
                            var size = results.value;

                            this.saveScreenshot(path.join(options.currentFolder , file), function(){
                                // use selector if defined - may be from a page object
                                // otherwise, use the element selector string
                                cropElement.call(this, path.join(options.currentFolder , file), origin, size, function(){
                                    compareToBaseline.call(this, file, callback);
                                });
                            });
                        });
                    });

                } else {
                    this.saveScreenshot.call(this, path.join(options.currentFolder , file), function(){
                        compareToBaseline.call(this, file, callback);
                    });
                }

            });
        });
    };

};