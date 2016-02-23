/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/tape/tape.d.ts" />
/// <reference path="../typings/sprintf-js/sprintf-js.d.ts" />

"use strict";

import * as path from "path";

import * as test from "tape";
import { sprintf } from "sprintf-js";

import { processConfig, Config } from "./../src/config-helper";
import * as fsp from "./../src/fs-promises";

test("A passing test", (assert) => {
    writeHeaderIfMissing1().then(() => {
        assert.pass("This test will pass.");

        assert.end();
    }).catch((err) => {
        console.log(err);
    });
});

async function writeHeaderIfMissing1() {
    const config = await processConfig("C:/Users/David/OneDrive/Documents/hardware-projects/code/dht2csv", "sensorconfig.json");
    //await writeHeaderIfMissing2(config);
}

// 2015-01-01T00:00:00+01:00, -18.2
