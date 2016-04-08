"use strict";
// Ensure this is treated as a module.
Array.prototype.addAll = function (arr) {
    for (const elm of arr) {
        this.push(elm);
    }
};
if (!Array.prototype.includes) {
    Array.prototype.includes = function (element) {
        return this.indexOf(element) > -1;
    };
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString) {
        return this.substring(0, searchString.length) === searchString;
    };
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString) {
        return this.indexOf(searchString, this.length - searchString.length) > -1;
    };
}
if (!Date.prototype.isValid) {
    Date.prototype.isValid = function () {
        // An invalid date object returns NaN for getTime() and NaN is the only
        // object not strictly equal to itself.
        return this.getTime() === this.getTime();
    };
}
if (!Object.values) {
    Object.values = function (obj) {
        let l = [];
        for (const propName in obj) {
            l.push(obj[propName]);
        }
        return l;
    };
}
//# sourceMappingURL=global-extensions.js.map