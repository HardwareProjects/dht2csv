/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/node-dht-sensor/node-dht-sensor.d.ts" />

"use strict";

import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as _ from "lodash";

// The used version of the node-dht-sensor module reads gpio pins using the wiringPi library.
// The line will load the native node_dht_sensor.node module, which only succeeds if wiringPi is installed.
import * as sensorLib from "node-dht-sensor";

import "./global-extensions";
import * as fsp from "./fs-promises";
import * as processp from "./process-promises";
import { Sensor, Config, processConfig } from "./config-helper";
import { getIsoDate } from "./isodate-helper";
import { init as initLogger, info, warn, log } from "./logger";

// This file is located in the lib subdirectory when executed, so baseDir is one level up.
const baseDir = path.resolve(__dirname, "..");
const configFileName = "sensorconfig.json";
let config: Config = null;


// Lookup with the sensorName as key and the file descriptors for the 2 minutes historical values as value.
let sensorToValuesFd: { [sensorName: string]: { fdTemperature: number, fdHumidity: number } } = {};
// Lookup with the sensorName as key and the file descriptors for the 2 seconds historical values as value.
let sensorToLatestFd: { [sensorName: string]: { fdTemperature: number, fdHumidity: number } } = {};
// Lookup with the sensorName as key and the latest sensor value as value.
let sensorToVal: { [sensorName: string]: { temperatureC: number, humidityRel: number } } = {};

// Function is called recursively after the 2 second timeout.
function readSensors(sensor: Sensor, count: number) {
    info(`In readSensors. sensor.name '${sensor.name}', sensor.pin '${sensor.pin}', count '${count}'.`);
    const readout = sensorLib.read();
    const hrstart = process.hrtime();
    if (readout.isValid === false) {
        warn(`Error reading sensor with name '${sensor.name}', type '${sensor.type}' on pin '${sensor.pin}'. Error count '${readout.errors}'.`);
    } else {
        // Skip first 2 readouts because they are 0.
        if (++count > 2) {
            // Do not wait until data is written.
            onNewSensorReadout(sensor.name, readout.temperature, readout.humidity);
        }
    }
    const hrend = process.hrtime(hrstart);
    // hrend[0] contains passed seconds, hrend[1] contains passed nanoseconds
    const msDuration = hrend[0] * 1000.0 + hrend[1] / 1000000.0;
    // Collecting period (or sampling period) is 2000 ms for DHT22 and 1000 ms for DHT11. Here set to 2000 because node-dht-sensor lib returns previous measurement if called earlier.
    const durationBetweenSamples = 2000;
    // Substract time since last read from durationBetweenSamples.
    // Could subtract further 520 ms based on the two bcm2835_delay(xx) statements in readDHT function in node-dht-sensor.cpp
    setTimeout(readSensors, Math.max(0, durationBetweenSamples - msDuration), sensor, count);
}

// Function is called when a new sensor value was read. This is about every 2 seconds.
async function onNewSensorReadout(sensorName: string, temperatureC: number, humidityRel: number) {
    info(`In onNewSensorReadout. sensorName '${sensorName}', temperatureC '${temperatureC}', humidityRel '${humidityRel}'.`);
    sensorToVal[sensorName] = { temperatureC: temperatureC, humidityRel: humidityRel };
    const now = new Date();
    await fsp.ftruncate(sensorToLatestFd[sensorName].fdTemperature);
    await fsp.ftruncate(sensorToLatestFd[sensorName].fdHumidity);
    writeSensorVal(sensorToLatestFd[sensorName].fdTemperature, temperatureC, now, false);
    writeSensorVal(sensorToLatestFd[sensorName].fdHumidity, humidityRel, now, false);
}

function onTwoMinuteIntervall() {
    info("In onTwoMinuteIntervall.");
    for (const sensor of config.sensors) {
        const now = new Date();
        // Do not wait for writeSensorVal to return.
        writeSensorVal(sensorToValuesFd[sensor.name].fdTemperature, sensorToVal[sensor.name].temperatureC, now, true);
        writeSensorVal(sensorToValuesFd[sensor.name].fdHumidity, sensorToVal[sensor.name].humidityRel, now, true);
    }
}

async function writeSensorVal(fd: number, sensorVal: number, date: Date, addNewLine: boolean) {
    info(`In writeSensorVal. fd '${fd}',  sensorVal '${sensorVal}', date '${date}', addNewLine '${addNewLine}'.`);
    // Length of a data line in the output file excluding \n character.
    const totalRowLen = 32;
    const dateWithPadding = getIsoDate(date) + ",      ";
    const sensorValStr = sensorVal.toFixed(1);
    const row = dateWithPadding.substr(0, totalRowLen - sensorValStr.length) + sensorValStr + (addNewLine ? "\n" : "");
    await fsp.write(fd, row);
}

// Ensures the baseDir directory exists, opens the temperatureValues files and writes a header if the file is empty.
async function openFilesEnsureHeader() {
    info("In openFilesEnsureHeader");
    async function openFilesEnsureHeaderHelper(filePath: string, header: string) {
        info(`Opening or creating file '${filePath}' and writing header if it contains zero bytes.`);
        const fd = await fsp.open(filePath, "a");
        const fstat = await fsp.fstat(fd);
        if (fstat.stats.size === 0) {
            await fsp.write(fd, header);
        }
        return fd;
    }

    for (const sensor of config.sensors) {
        const dir = path.resolve(baseDir, sensor.outputBasepath, sensor.name);
        info(`Creating directory '${dir}' for sensor data files if not existing.`);
        await fsp.mkdirp(dir);

        const fdTemperature = await openFilesEnsureHeaderHelper(sensor.temperatureValuesPath, "Iso Date,Temperature in Celsius\n");
        const fdHumidity = await openFilesEnsureHeaderHelper(sensor.humidityValuesPath, "Iso Date,Humidity in %\n");
        sensorToValuesFd[sensor.name] = { fdTemperature: fdTemperature, fdHumidity: fdHumidity };

        const fdTemperatureLatest = await fsp.open(sensor.temperatureLatestPath, "w");
        const fdHumidityLatest = await fsp.open(sensor.humidityLatestPath, "w");
        sensorToLatestFd[sensor.name] = { fdTemperature: fdTemperatureLatest, fdHumidity: fdHumidityLatest };
    }
}

async function main() {
    // Do not log method name, because logfile is not open yet.
    config = await processConfig(baseDir, configFileName, log);
    await initLogger(config.logfilePath, config.loglevel);
    // Log once to console to give a feedback that the script started successfully.
    console.info(`Script started. See the '${configFileName}' for the logfilePath and the output directory of the sensor values.`);
    await openFilesEnsureHeader();

    // Call node-dht-sensor Lib, which will initialize the native wiringPi library.
    // A failure here has nothing to do with the sensor but likely with the installation of the wiringPi library.
    const isInitialized = sensorLib.initialize(config.sensors[0].type, config.sensors[0].pin);
    if (! isInitialized) {
        throw new Error("Failed to call 'initialize' on the 'node-dht-sensor' library. "
            + "'initialize' in turn initializes the native 'wiringPi' library.");
    }
    for (const sensor of config.sensors) {
        readSensors(sensor, 0);
    }
    setInterval(onTwoMinuteIntervall, 1000 * 120);
}

main().catch(err => {
    log("error", err);
});
