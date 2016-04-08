/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/tape/tape.d.ts" />
/// <reference path="../typings/proxyquire/proxyquire.d.ts" />

/// <reference path="../src/app.ts" />

// To run this test in Visual Studio Code, go to View->Debug, then select the "Debug Current Unittest file" target. Then press F5.

import { Logger, LogLevel, isInfoOrVerboser, LoggerOptions } from "./../src/log-helper";
import * as path from "path";
import * as test from "tape";
import * as proxyquire from "proxyquire";

import { processConfig, Config } from "./../src/config-helper";
import * as fsp from "./../src/fs-promises";

let stubSensorLib = {
    initialize: function (sensorType: number, GPIOPort: number) {
        return true;
    },
    readSpec: function (sensorType: number, GPIOPort: number) {
        return {
            humidity: 0.33,
            temperature: 22.4,
            isValid: true,
            errors: 0,
        };
    }
};

test("Call app.main", async (assert) => {
    const app = proxyquire("./../src/app", {
        "node-dht-sensor": {
            initialize: stubSensorLib.initialize,
            readSpec: stubSensorLib.readSpec,
            '@noCallThru': true
        }
    });
    // Change baseDir so the config file is found.
    app.baseDir = path.resolve(app.baseDir, "..", "..");

    console.log(`${app.baseDir}`);
    await app.main();
    assert.pass("This test will pass.");
    assert.end();
});
