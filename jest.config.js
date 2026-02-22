/** @type {import('jest').Config} */
module.exports = {
    projects: [
        // Renderer tests (DOM-dependent) — jsdom environment
        {
            displayName: 'renderer',
            testMatch: ['<rootDir>/tests/renderer/**/*.test.js'],
            testEnvironment: 'jsdom',
        },
        // Main process tests — Node environment
        {
            displayName: 'main',
            testMatch: ['<rootDir>/tests/main/**/*.test.js'],
            testEnvironment: 'node',
        },
    ],
    // HTML report — generated after all suites complete
    reporters: [
        'default',
        [
            'jest-html-reporter',
            {
                pageTitle: 'Chronos — Test Report',
                outputPath: './test-report/index.html',
                includeFailureMsg: true,
                includeSuiteFailure: true,
                includeConsoleLog: false,
                theme: 'darkTheme',
                sort: 'status',
                dateFormat: 'yyyy-MM-dd HH:mm:ss',
            },
        ],
    ],
    collectCoverage: true,
    coverageDirectory: './test-report/coverage',
    coverageReporters: ['text', 'text-summary', 'html'],
    coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
    verbose: true,
};
