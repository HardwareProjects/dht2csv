/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/node-dht-sensor/node-dht-sensor.d.ts" />
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const path = require("path");
// The used version of the node-dht-sensor module reads gpio pins using the wiringPi library.
// The line will load the native node_dht_sensor.node module, which only succeeds if wiringPi is installed.
const sensorLib = require("node-dht-sensor");
require("./global-extensions");
const fsp = require("./fs-promises");
const config_helper_1 = require("./config-helper");
const isodate_helper_1 = require("./isodate-helper");
const log_helper_1 = require("./log-helper");
const constants_1 = require("./constants");
// This file is located in the lib subdirectory when executed, so baseDir is one level up. Export for unit test. 
exports.baseDir = path.resolve(__dirname, "..");
const configFileName = "config.json";
let config = null;
// Will be set to true if the logging level is info or higher.
let isInfo = null;
let log = null;
// Lookup with the sensorName as key and the file descriptors for the 2 minutes historical values as value.
let sensorToValuesFd = {};
// Lookup with the sensorName as key and the file descriptors for the 2 seconds historical values as value.
let sensorToLatestFd = {};
// Lookup with the sensorPin as key and the latest sensor value as value.
let sensorToVal = {};
// Function is called recursively after the 2 second timeout.
function readSensors(sensor, count) {
    isInfo && log.info(`In readSensors. sensor.pin '${sensor.pin}', count '${count}'.`);
    const readout = sensorLib.readSpec(sensor.type, sensor.pin);
    const hrstart = process.hrtime();
    if (readout.isValid === false) {
        log.warn(`Error reading sensor on pin '${sensor.pin}', type '${sensor.type}'. Error count '${readout.errors}'.`);
    }
    else {
        // Skip first 2 readouts because they are 0.
        if (++count > 2) {
            let tempVal = readout.temperature;
            if (config.temperatureUnit === constants_1.TemperatureUnit.Fahrenheit) {
                tempVal = 1.8 * readout.temperature + 32.0;
            }
            else if (config.temperatureUnit === constants_1.TemperatureUnit.Kelvin) {
                tempVal = readout.temperature + 273.15;
            }
            // Do not wait until data is written.
            onNewSensorReadout(sensor.pin, tempVal, readout.humidity);
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
function onNewSensorReadout(sensorPin, temperature, humidityRel) {
    return __awaiter(this, void 0, void 0, function* () {
        isInfo && log.info(`In onNewSensorReadout. sensorPin '${sensorPin}', temperature '${temperature}', humidityRel '${humidityRel}'.`);
        sensorToVal[sensorPin] = { temperatureC: temperature, humidityRel: humidityRel };
        const now = new Date();
        writeSensorVal(sensorToLatestFd[sensorPin].fdTemperature, temperature, now, false, true);
        writeSensorVal(sensorToLatestFd[sensorPin].fdHumidity, humidityRel, now, false, true);
    });
}
function onTwoMinuteInterval() {
    isInfo && log.info("In onTwoMinuteInterval.");
    for (const sensor of config.sensors) {
        const now = new Date();
        // Do not wait for writeSensorVal to return.
        writeSensorVal(sensorToValuesFd[sensor.pin].fdTemperature, sensorToVal[sensor.pin].temperatureC, now, true, false);
        writeSensorVal(sensorToValuesFd[sensor.pin].fdHumidity, sensorToVal[sensor.pin].humidityRel, now, true, false);
    }
}
function writeSensorVal(fd, sensorVal, date, addNewLine, writeAtBeginning) {
    return __awaiter(this, void 0, void 0, function* () {
        isInfo && log.info(`In writeSensorVal. fd '${fd}', sensorVal '${sensorVal}', date '${date.toLocaleString()}', addNewLine '${addNewLine}'.`);
        // Length of a data line in the output file excluding \n character.
        const totalRowLen = 32;
        const dateWithPadding = isodate_helper_1.getIsoDate(date) + ",      ";
        const sensorValStr = sensorVal.toFixed(1);
        const row = dateWithPadding.substr(0, totalRowLen - sensorValStr.length) + sensorValStr + (addNewLine ? "\n" : "");
        // If the existing content size is equal to the written content size, then setting position to 0 replaces all existing content.
        const position = writeAtBeginning ? 0 : undefined;
        yield fsp.write(fd, row, position);
    });
}
// Ensures the baseDir directory exists, opens the temperatureValues files and writes a header if the file is empty.
function openFilesEnsureHeader() {
    return __awaiter(this, void 0, void 0, function* () {
        isInfo && log.info("In openFilesEnsureHeader");
        function openFilesEnsureHeaderHelper(filePath, header) {
            return __awaiter(this, void 0, void 0, function* () {
                isInfo && log.info(`Opening or creating file '${filePath}' and writing header if it contains zero bytes.`);
                const fd = yield fsp.open(filePath, "a");
                const fstat = yield fsp.fstat(fd);
                if (fstat.stats.size === 0) {
                    yield fsp.write(fd, header);
                }
                return fd;
            });
        }
        for (const sensor of config.sensors) {
            isInfo && log.info(`Creating directory '${sensor.dataDirectory}' for sensor data files if not existing.`);
            yield fsp.mkdirp(sensor.dataDirectory);
            const fdTemperature = yield openFilesEnsureHeaderHelper(sensor.temperatureValuesPath, `Iso Date,Temperature in ${config.temperatureUnit}\n`);
            const fdHumidity = yield openFilesEnsureHeaderHelper(sensor.humidityValuesPath, "Iso Date,Humidity in %\n");
            sensorToValuesFd[sensor.pin] = { fdTemperature: fdTemperature, fdHumidity: fdHumidity };
            const fdTemperatureLatest = yield fsp.open(sensor.temperatureLatestPath, "w");
            const fdHumidityLatest = yield fsp.open(sensor.humidityLatestPath, "w");
            sensorToLatestFd[sensor.pin] = { fdTemperature: fdTemperatureLatest, fdHumidity: fdHumidityLatest };
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Do not log method name, because logfile is not open yet.
        config = yield config_helper_1.parseConfig(exports.baseDir, configFileName);
        // Add filename as tag for the logger instance.
        const tags = [path.basename(__filename)];
        log = new log_helper_1.Logger(config.logger, tags);
        isInfo = log_helper_1.isInfoOrVerboser(config.logger.level);
        config = yield config_helper_1.processConfig(config, log.warn);
        log.info2("always", `Script started. See the '${configFileName}' for the output directory of the sensor values and other options.`);
        yield openFilesEnsureHeader();
        // Tell wiringPi to use /dev/gpiomem instead of /dev/gpio so that no admin privileges are needed on Raspbian.
        process.env["WIRINGPI_GPIOMEM"] = 1;
        // Call node-dht-sensor Lib, which will initialize the native wiringPi library.
        // A failure here has nothing to do with the sensor but likely with the installation of the wiringPi library.
        const isInitialized = sensorLib.initialize(config.sensors[0].type, config.sensors[0].pin);
        if (!isInitialized) {
            throw new Error("Failed to call 'initialize' on the 'node-dht-sensor' library. "
                + "'initialize' in turn initializes the native 'wiringPi' library.");
        }
        for (const sensor of config.sensors) {
            readSensors(sensor, 0);
        }
        // Start the 2 minute interval first after 6 seconds then every 2 minutes.
        setTimeout(() => {
            setInterval(onTwoMinuteInterval, 1000 * 120);
            onTwoMinuteInterval();
        }, 1000 * 6);
    });
}
exports.main = main;
if (require.main === module) {
    main().catch((err) => __awaiter(this, void 0, void 0, function* () {
        if (log) {
            yield log.error(err);
        }
        else {
            console.error(err);
        }
    }));
}
//# sourceMappingURL=app.js.map