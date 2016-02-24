"use strict";

// Ensure this is treated as a module.
export {};

declare global {
    interface Array<T> {
        addAll(arr: T[]): void;
        contains(arr: T): boolean;
    }

    interface String {
        contains(searchString: string): boolean;
        startsWith(searchString: string): boolean;
        endsWith(searchString: string): boolean;
    }
}

Array.prototype.addAll = function (arr: any[]) {
    for (const elm of arr) {
        this.push(elm);
    }
};

Array.prototype.contains = function (element: any) {
    return this.indexOf(element) > -1;
};

String.prototype.contains = function (searchString: string) {
    return this.indexOf(searchString) > -1;
};

String.prototype.startsWith = function (searchString: string) {
    return this.substring(0, searchString.length) === searchString;
};

String.prototype.endsWith = function (searchString: string) {
    return this.indexOf(searchString, this.length - searchString.length) > -1;
};
