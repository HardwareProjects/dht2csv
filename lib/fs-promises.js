"use strict";
var fs = require("fs");
var path = require("path");
const mkdirpLib = require("mkdirp");
(function (FileType) {
    FileType[FileType["Undefined"] = 0] = "Undefined";
    FileType[FileType["NotExists"] = 1] = "NotExists";
    FileType[FileType["IsFile"] = 2] = "IsFile";
    FileType[FileType["IsDirectory"] = 3] = "IsDirectory";
    FileType[FileType["Other"] = 4] = "Other";
})(exports.FileType || (exports.FileType = {}));
var FileType = exports.FileType;
function open(path, flags) {
    return new Promise((resolve, reject) => {
        fs.open(path, flags, (err, fd) => {
            if (err)
                reject(err);
            else
                resolve(fd);
        });
    });
}
exports.open = open;
function open2(passThrough, path, flags) {
    return new Promise((resolve, reject) => {
        fs.open(path, flags, (err, fd) => {
            if (err)
                reject(err);
            else
                resolve({ fd: fd, passThrough: passThrough });
        });
    });
}
exports.open2 = open2;
function read(fd, buffer, offset, length, position) {
    return new Promise((resolve, reject) => {
        fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
            if (err)
                reject(err);
            else
                resolve({ fd: fd, bytesRead: bytesRead, buffer: buffer });
        });
    });
}
exports.read = read;
function readChunk(fd) {
    return new Promise((resolve, reject) => {
        fs.read(fd, new Buffer(1024), 0, 1024, null, (err, bytesRead, buffer) => {
            if (err)
                reject(err);
            else
                resolve({ fd: fd, bytesRead: bytesRead, buffer: buffer });
        });
    });
}
exports.readChunk = readChunk;
function fstat(fd) {
    return new Promise((resolve, reject) => {
        fs.fstat(fd, (err, stats) => {
            if (err)
                reject(err);
            else
                resolve({ fd: fd, stats: stats });
        });
    });
}
exports.fstat = fstat;
function stat(path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            if (err)
                reject(err);
            else
                resolve(stats);
        });
    });
}
exports.stat = stat;
function readdir(dir) {
    return new Promise((resolve, reject) => {
        let results = [];
        let pending;
        fs.readdir(dir, (err, files) => {
            if (err) {
                reject(err);
            }
            pending = files.length;
            files.forEach(filename => {
                fs.stat(path.posix.join(dir, filename), (err, stats) => {
                    if (err) {
                        reject(err);
                    }
                    const dirIndicator = stats.isDirectory() ? "/" : "";
                    const pathname = path.posix.join(dir, filename);
                    const nameLink = path.posix.basename(pathname, ".csv") + dirIndicator;
                    results.push({
                        name: pathname,
                        nameLink: nameLink,
                        isFile: stats.isFile(),
                        isDirectory: dirIndicator === "/"
                    });
                    if (--pending === 0) {
                        resolve(results);
                    }
                });
            });
        });
    });
}
exports.readdir = readdir;
function getFileType(path) {
    return new Promise((resolve, reject) => {
        return fs.stat(path, (err, stats) => {
            if (err) {
                const errCodeNoSuchFileOrDirectory = "ENOENT";
                if (err.code === errCodeNoSuchFileOrDirectory) {
                    resolve(FileType.NotExists);
                }
                reject(err);
            }
            else {
                resolve(stats.isDirectory() ? FileType.IsDirectory
                    : stats.isFile() ? FileType.IsFile : FileType.Other);
            }
        });
    });
}
exports.getFileType = getFileType;
function readFile(filename, options) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, options, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
}
exports.readFile = readFile;
function unlink(path) {
    return new Promise((resolve, reject) => {
        fs.unlink(path, err => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.unlink = unlink;
function fchown(fd, uid, gid) {
    return new Promise((resolve, reject) => {
        fs.fchown(fd, uid, gid, err => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.fchown = fchown;
function write(fd, data, position, encoding) {
    return new Promise((resolve, reject) => {
        fs.write(fd, data, position, encoding, (err, written, str) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.write = write;
function mkdirp(dir, mode) {
    return new Promise((resolve, reject) => {
        mkdirpLib(dir, mode, function (err, made) {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.mkdirp = mkdirp;
function ftruncate(fd, len) {
    return new Promise((resolve, reject) => {
        fs.ftruncate(fd, len, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.ftruncate = ftruncate;
//# sourceMappingURL=fs-promises.js.map