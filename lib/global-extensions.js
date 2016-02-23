"use strict";
Array.prototype.addAll = function (arr) {
    for (const elm of arr) {
        this.push(elm);
    }
};
Array.prototype.contains = function (element) {
    return this.indexOf(element) > -1;
};
String.prototype.startsWith = function (searchString) {
    return this.substring(0, searchString.length) === searchString;
};
String.prototype.endsWith = function (searchString) {
    return this.indexOf(searchString, this.length - searchString.length) > -1;
};
String.prototype.contains = function (searchString) {
    return this.indexOf(searchString) > -1;
};
//# sourceMappingURL=global-extensions.js.map