// Ensure this is treated as a module.
export {};

declare global {
    interface Array<T> {
        addAll(arr: T[]): void;
        includes(arr: T): boolean;
    }

    interface String {
        startsWith(searchString: string): boolean;
        endsWith(searchString: string): boolean;
    }

    interface Date {
        isValid(): boolean;
    }

    interface Object {
        values(obj: any): any[];
    }
}

Array.prototype.addAll = function (arr: any[]) {
    for (const elm of arr) {
        this.push(elm);
    }
};

if (! Array.prototype.includes) {
    Array.prototype.includes = function (element: any) {
        return this.indexOf(element) > -1;
    };
}

if (! String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString: string) {
        return this.substring(0, searchString.length) === searchString;
    };
}

if (! String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString: string) {
        return this.indexOf(searchString, this.length - searchString.length) > -1;
    };
}

if (! Date.prototype.isValid) {
    Date.prototype.isValid = function () {
        // An invalid date object returns NaN for getTime() and NaN is the only
        // object not strictly equal to itself.
        return this.getTime() === this.getTime();
    };
}

if (! Object.values) {
    Object.values = function (obj) {
        let l = [] as any[];
        for (const propName in obj) {
            l.push(obj[propName]);
        }
        return l;
    };
}
