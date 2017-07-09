const proc = require('child_process');
const gulp = require('gulp');
const del = require('del');
const gulpSequence = require("gulp-sequence");

const outputDir = 'Output';
const nodeModulesDir = 'node_modules';

// Asynchronously executes a given command line, and displays error if found.
// Errouneous execution will stop the Gulp process.
// Returns a promise.
const executeProcess = toExec => {
    return new Promise((resolve, reject) => {
        proc.exec(toExec, (error, stdout, stderr) => {
            if (error) {
                error.stack = stdout;
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
};

gulp.task('compile', done => {
    executeProcess(`${__dirname}/node_modules/.bin/tsc`)
        .then(done())
        .catch(done);
});

gulp.task('clean', () => {
    del.sync(`${outputDir}/**`);
})

gulp.task('build', ['compile']);

gulp.task('copy-files', () => {
    return gulp
        .src([`!${outputDir}/**/*`, `!${nodeModulesDir}/**/*`, '**/*.json'])
        .pipe(gulp.dest(outputDir))
});

gulp.task('clean-build', gulpSequence('clean', ['build', 'copy-files']));