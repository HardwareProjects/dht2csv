import * as path from "path";
import * as stream from "stream";
import * as test from "tape";
import { Logger, LogLevel, LoggerOptions, Message, isErrorOrVerboser, isWarnOrVerboser, isInfoOrVerboser, isDebugOrVerboser } from "./../src/log-helper";

let isInfo: boolean = null;
let log: Logger = null;

let config: { logger: LoggerOptions } = {
    "logger": {
        "level": "INFO",
        "destinations": []
    }
};

test("Logger test", async (assert) => {
    // Add filename as tag for the logger instance.
    const tags = [path.basename(__filename)];
    const testStreams = [createStringStream(), createStringStream()];
    config.logger.destinations = testStreams;
    const log = new Logger(config.logger, tags);
    
    const isError = isErrorOrVerboser(config.logger.level);
    const isWarn = isWarnOrVerboser(config.logger.level);
    const isInfo = isInfoOrVerboser(config.logger.level);
    const isDebug = isDebugOrVerboser(config.logger.level);
    assert.true(isError, "INFO is more verbose than ERROR");
    assert.true(isWarn, "INFO is more verbose than WARN");
    assert.true(isInfo, "INFO is as verbose as INFO");
    assert.false(isDebug, "INFO is less verbose than DBUG");

    let res0: Message;
    let res1: Message;    
    await log.error(new Error("test exception without tag"));
    res0 = JSON.parse(testStreams[0].read());
    res1 = JSON.parse(testStreams[1].read());
    assert.equal(res0.level, "ERROR");
    assert.equal(res0.stack.substr(0, 6), "Error:");
    assert.deepEqual(res0, res1);
    await log.error(["mytag"], new Error("test exception with tag"));
    res0 = JSON.parse(testStreams[0].read());
    testStreams[1].read(); // clear stream
    assert.true(res0.tags.includes("mytag"));
    
    await log.warn("test warn without tag. Args: %s", "first arg");
    res0 = JSON.parse(testStreams[0].read());
    res1 = JSON.parse(testStreams[1].read());
    await log.warn(["mytag"], "test warn with tag. Args: %s", "first arg");
    res0 = JSON.parse(testStreams[0].read());
    testStreams[1].read(); // clear stream
    assert.true(res0.tags.includes("mytag"));
    
    await log.info("test info without tag. Args: %s", "first arg");
    res0 = JSON.parse(testStreams[0].read());
    res1 = JSON.parse(testStreams[1].read());
    assert.isEqual(res1, null, "Only ERROR and WARN messages should be written to destinations[1].");
    await log.info(["mytag"], "test info with tag. Args: %s", "first arg");
    res0 = JSON.parse(testStreams[0].read());
    testStreams[1].read(); // clear stream
    assert.true(res0.tags.includes("mytag"));
    
    assert.end();
});

function createStringStream() {
    var s = new stream.Transform();
    s._transform = function (data, encoding, callback) {
        callback(null, data);
    };
    s.setEncoding("utf8");
    return s;
}
