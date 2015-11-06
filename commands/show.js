/**
 * Make the given element(s) visible
 * Use after the `hide` command to restore visibility
 * @param  {String}   selector Selector for element(s) to show
 * @param  {Function} callback Callback to invoke when finished
 * @return {Object}            Return 'this' to allow chaining
 */
exports.command = function(selector, callback) {
    var options = this.globals.visualRegression
    var self    = this;
    var ancestors = selector;
    var oElement;

    // If the selector comes from a section of a page object
    // selector will be an array of objects starting from the outermost
    // ancestor (section), and ending with the element
    // Join their selectors in order
    if( typeof ancestors !== 'string' ){
        selector = '';

        while( oElement = ancestors.shift() ){
            selector += ' ' + oElement.selector;
        }
    }

    // Merge with global configuration
    if( options.censorSelectors ){
        selector += ',' + options.censorSelectors.join(',');
    }

    this.execute(function(selector){
        var els = document.querySelectorAll(selector);
        var i   = els.length;

        while( i-- ){
            els[i].style.visibility = '';
        }
    }, [selector], function(){
        if( typeof callback === 'function' ){
            callback.call(this);
        }
    });

    return this;
};