/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 */

// Zone.js is required by default for Angular
import 'zone.js';

// Polyfills for older browsers
import 'classlist.js'; // Required for IE/older browsers that don't support classList
import 'web-animations-js'; // Required for animation support in older browsers

// Core-JS polyfills for ES features
import 'core-js/es/symbol';
import 'core-js/es/object';
import 'core-js/es/function';
import 'core-js/es/parse-int';
import 'core-js/es/parse-float';
import 'core-js/es/number';
import 'core-js/es/math';
import 'core-js/es/string';
import 'core-js/es/date';
import 'core-js/es/array';
import 'core-js/es/regexp';
import 'core-js/es/map';
import 'core-js/es/weak-map';
import 'core-js/es/set';
import 'core-js/es/reflect';

// ES2015+ features
import 'core-js/es/promise';
import 'core-js/es/array/find';
import 'core-js/es/array/includes';
import 'core-js/es/string/includes';
import 'core-js/es/string/starts-with';
import 'core-js/es/string/ends-with';

// ES2016+ features that Chromium 91 might not fully support
import 'core-js/es/array/flat';
import 'core-js/es/array/flat-map';
import 'core-js/es/object/from-entries';
import 'core-js/es/string/match-all';
import 'core-js/es/string/replace-all';

// DOM polyfills
import 'core-js/web/dom-collections';
import 'core-js/stable';
