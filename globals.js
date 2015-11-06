module.exports = {
    visualRegression: {
        // Just a placeholder - doesn't actually work yet
        enabled:         true,

        // Baseline screenshots stored here
        baselineFolder:  'nightwatch/screenshots/baseline',

        // Screenshots for the current run stored here
        currentFolder:   'nightwatch/screenshots/new',

        // Screenshots failing comparison stored here
        errorFolder:     'nightwatch/screenshots/failures',

        // If no selector is provided, default to this one
        defaultSelector: 'body',

        // Automatically hide any elements matching these selectors
        // Currently requires a call to `hide`
        censorSelectors: [
        ],

        // Fail the regression assertion if the images are more than
        // this percent different
        mismatchTolerance: 0.3
    }
};
