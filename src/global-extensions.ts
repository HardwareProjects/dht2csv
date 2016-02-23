// Note, you must IMPORT this file to extend the build-in array
// AND you must REFERENCE this file in order for intellisense to work.
// Referencing this file puts the declaration "Array<T>" in the same global scope as the 
// built-in array instead of in the module scope.

"use strict";

interface Array<T> {
   addAll(arr: T[]): void;
   contains(arr: T): boolean;
}

interface String {
   contains(searchString: string): boolean;
}

(Array.prototype as any).addAll = function (arr: any[]) {
    for (const elm of arr) {
        this.push(elm);
    }
};

Array.prototype.contains = function (element: any) {
    return this.indexOf(element) > -1;
};

String.prototype.startsWith = function (searchString: string) {
    return this.substring(0, searchString.length) === searchString;
};

String.prototype.endsWith = function (searchString: string) {
    return this.indexOf(searchString, this.length - searchString.length) > -1;
};

String.prototype.contains = function (searchString: string) {
    return this.indexOf(searchString) > -1;
};
