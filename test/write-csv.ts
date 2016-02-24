/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/tape/tape.d.ts" />

"use strict";

// To run this test in Visual Studio Code, go to View->Debug, then select the "Debug Current Unittest file" target. Then press F5.

import * as path from "path";
import * as test from "tape";

import { processConfig, Config } from "./../src/config-helper";
import * as fsp from "./../src/fs-promises";

test("A passing test", (assert) => {
    assert.pass("This test will pass.");
    assert.end();
});
