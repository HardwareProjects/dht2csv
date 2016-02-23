"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var path = require("path");
var sensorLib = require("node-dht-sensor");
require("./global-extensions");
var fsp = require("./fs-promises");
var config_helper_1 = require("./config-helper");
var log_helper_1 = require("./log-helper");
var isodate_helper_1 = require("./isodate-helper");
const baseDir = path.resolve(__dirname, "..");
console.log("basedir: " + baseDir);
const configName = "sensorconfig.json";
let config = null;
let logger = null;
let sensorToValuesFd = {};
let sensorToLatestFd = {};
let sensorToVal = {};
function readSensors(sensor) {
    const readout = sensorLib.read();
    const hrstart = process.hrtime();
    if (readout.isValid === false) {
        logger.warn(`Error reading sensor with name '${sensor.name}', type '${sensor.type}' on pin '${sensor.pin}'. Error count '${readout.errors}'.`);
    }
    else {
        onNewSensorReadout(sensor.name, readout.temperature, readout.humidity);
    }
    const hrend = process.hrtime(hrstart);
    const msDuration = hrend[0] * 1000.0 + hrend[1] / 1000000.0;
    const durationBetweenSamples = 2000;
    setTimeout(readSensors, Math.max(0, durationBetweenSamples - msDuration), sensor);
}
function onNewSensorReadout(sensorName, temperatureC, humidityRel) {
    return __awaiter(this, void 0, Promise, function* () {
        console.info("onNewSensorReadout " + temperatureC + " " + humidityRel);
        sensorToVal[sensorName] = { temperatureC: temperatureC, humidityRel: humidityRel };
        const now = new Date();
        yield fsp.ftruncate(sensorToLatestFd[sensorName].fdTemperature);
        yield fsp.ftruncate(sensorToLatestFd[sensorName].fdHumidity);
        writeSensorVal(sensorToLatestFd[sensorName].fdTemperature, temperatureC, now, false);
        writeSensorVal(sensorToLatestFd[sensorName].fdHumidity, humidityRel, now, false);
    });
}
function onTwoMinuteIntervall() {
    console.info("onTwoMinuteIntervall");
    for (const sensor of config.sensors) {
        const now = new Date();
        writeSensorVal(sensorToValuesFd[sensor.name].fdTemperature, sensorToVal[sensor.name].temperatureC, now, true);
        writeSensorVal(sensorToValuesFd[sensor.name].fdHumidity, sensorToVal[sensor.name].humidityRel, now, true);
    }
}
function writeSensorVal(fd, sensorVal, date, addNewLine) {
    return __awaiter(this, void 0, Promise, function* () {
        const totalRowLen = 32;
        const dateWithPadding = isodate_helper_1.getIsoDate(date) + ",      ";
        const sensorValStr = sensorVal.toFixed(1);
        const row = dateWithPadding.substr(0, totalRowLen - sensorValStr.length) + sensorValStr + (addNewLine ? "\n" : "");
        yield fsp.write(fd, row);
    });
}
function openFilesEnsureHeader() {
    return __awaiter(this, void 0, Promise, function* () {
        function openFilesEnsureHeaderHelper(filePath, header) {
            return __awaiter(this, void 0, Promise, function* () {
                console.info(`Opening or creating file '${filePath}' and writing header if it contains zero bytes.`);
                const fd = yield fsp.open(filePath, "a");
                const fstat = yield fsp.fstat(fd);
                if (fstat.stats.size === 0) {
                    yield fsp.write(fd, header);
                }
                return fd;
            });
        }
        for (const sensor of config.sensors) {
            const dir = path.resolve(baseDir, sensor.outputBasepath, sensor.name);
            console.info(`Creating directory for sensor data files if not existing '${dir}'.`);
            yield fsp.mkdirp(dir);
            const fdTemperature = yield openFilesEnsureHeaderHelper(sensor.temperatureValuesPath, "Iso Date,Temperature in Celsius\n");
            const fdHumidity = yield openFilesEnsureHeaderHelper(sensor.humidityValuesPath, "Iso Date,Humidity in %\n");
            sensorToValuesFd[sensor.name] = { fdTemperature: fdTemperature, fdHumidity: fdHumidity };
            const fdTemperatureLatest = yield fsp.open(sensor.temperatureLatestPath, "w");
            const fdHumidityLatest = yield fsp.open(sensor.humidityLatestPath, "w");
            sensorToLatestFd[sensor.name] = { fdTemperature: fdTemperatureLatest, fdHumidity: fdHumidityLatest };
        }
    });
}
function main() {
    return __awaiter(this, void 0, Promise, function* () {
        config = yield config_helper_1.processConfig(baseDir, configName);
        logger = yield log_helper_1.createLogger(config);
        console.info("Script started. Writing all log messages to the logfilePath specified in 'sensorconfig.json'.");
        logger.info("Config parsed, logger initialized.");
        yield openFilesEnsureHeader();
        const isInitialized = sensorLib.initialize(config.sensors[0].type, config.sensors[0].pin);
        if (!isInitialized) {
            log_helper_1.logErrorAndExit(logger, "Failed to call 'initialize' on the 'node-dht-sensor' library. "
                + "'initialize' in turn initializes the native 'BCM2835' library. Check the github page of 'node-dht-sensor' for help.");
        }
        for (const sensor of config.sensors) {
            readSensors(sensor);
        }
        setInterval(onTwoMinuteIntervall, 1000 * 120);
    });
}
main().catch(err => log_helper_1.logErrorAndExit(logger, err));
//# sourceMappingURL=app.js.map