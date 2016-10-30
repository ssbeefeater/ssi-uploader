"use strict";

var gulp = require('gulp');
var concat = require('gulp-concat');
var source = require('vinyl-source-stream');
var closure = require('gulp-closure-compiler-service');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var gulpif = require('gulp-if');
var sprity = require('sprity');
var csso = require('gulp-csso');
var rename = require('gulp-rename');
var config = {
    port: 9005,
    devBaseUrl: 'http://localhost',
    paths: {
        html: './src/*.html',
        ssi_uploaderJs: './src/ssi-uploader/js/ssi-uploader.js',
        ssi_uploaderSass: './src/ssi-uploader/styles/ssi-uploader.scss',
        ssi_uploaderImage: './src/ssi-uploader/styles/images/**/*.{png,jpg}',
        dist: './dist'
    },
    sassOptions: {
        errLogToConsole: true,
        outputStyle: 'expanded'
    }
};
gulp.task('browser-sync', function () {
    browserSync.init({
        server: {
            baseDir: "./dist"
        },
        ui: {
            port: 9090
        }
    });
});
gulp.task('sprites', function () {
    return sprity.src({
         src: config.paths.ssi_uploaderImage,
         style: './sprite.scss',
         cssPath: 'images/',
         processor: 'sass'// make sure you have installed sprity-sass
     })
     .on('error', console.error.bind(console))
     .pipe(gulpif('*.png', gulp.dest('./dist/ssi-uploader/styles/images/'), gulp.dest('./src/ssi-uploader/styles/')))
});
gulp.task('html', function () {
    gulp.src(config.paths.html)
     .pipe(gulp.dest(config.paths.dist))
     .pipe(browserSync.reload({stream: true}))
});
gulp.task('compile', function () {
    gulp.src(config.paths.ssi_uploaderJs)
        .pipe(sourcemaps.init())
        .pipe(closure()).on('error', console.error.bind(console))
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.paths.dist + '/ssi-uploader/js/'))
        .on('error', console.error.bind(console));
});
gulp.task('js', function () {
    gulp.src(config.paths.ssi_uploaderJs)
     .on('error', console.error.bind(console))
     .pipe(gulp.dest(config.paths.dist + '/ssi-uploader/js'))
    .pipe(browserSync.reload({stream: true}));
});
gulp.task('sass', function () {
    gulp.src(config.paths.ssi_uploaderSass)
     .pipe(sass(config.sassOptions))
     .on('error', console.error.bind(console))
     .pipe(autoprefixer())
     .pipe(gulp.dest(config.paths.dist + '/ssi-uploader/styles'))
     .pipe(browserSync.reload({stream: true}))
     .pipe(rename({suffix: '.min'}))
     .pipe(sourcemaps.init())
     .pipe(csso())
     .on('error', console.error.bind(console))
     .pipe(sourcemaps.write('.'))
     .pipe(gulp.dest(config.paths.dist + '/ssi-uploader/styles'));
});
gulp.task('images', function () {
    gulp.src(config.paths.ssi_uploaderImage)
     .pipe(gulp.dest(config.paths.dist + '/ssi-uploader/images'));
});
gulp.task('watch', function () {
    gulp.watch(config.paths.html, ['html']);
    gulp.watch(config.paths.ssi_uploaderJs, ['js']);
    gulp.watch(config.paths.ssi_uploaderSass, ['sass']);
    gulp.watch(config.paths.ssi_uploaderImage, ['images']);
});
gulp.task('default', ['html', 'sass', 'js', 'browser-sync', 'watch']);
