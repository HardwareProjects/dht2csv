/// <reference path="../typings/mkdirp/mkdirp.d.ts" />

"use strict";
import * as fs from "fs";
import * as path from "path";
const mkdirpLib = require("mkdirp");

export enum FileType { Undefined, NotExists, IsFile, IsDirectory, Other }

export function open(path: string, flags: string): Promise<number> {
    return new Promise((resolve, reject) => {
        fs.open(path, flags, (err, fd) => {
            if (err) reject(err);
            else resolve(fd);
        });
    });
}

export function open2<T>(passThrough: T, path: string, flags: string): Promise<{ fd: number, passThrough: T }> {
    return new Promise((resolve, reject) => {
        fs.open(path, flags, (err, fd) => {
            if (err) reject(err);
            else resolve({ fd: fd, passThrough: passThrough });
        });
    });
}

export function read(fd: number, buffer: Buffer, offset: number, length: number, position: number):
    Promise<{ fd: number, bytesRead: number, buffer: Buffer }> {
    return new Promise((resolve, reject) => {
        fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
            if (err) reject(err);
            else resolve({ fd: fd, bytesRead: bytesRead, buffer: buffer });
        });
    });
}

export function readChunk(fd: number): Promise<{ fd: number, bytesRead: number, buffer: Buffer }> {
    return new Promise((resolve, reject) => {
        // Set position to null, so data will be read from the current file position of the open file.
        fs.read(fd, new Buffer(1024), 0, 1024, null, (err, bytesRead, buffer) => {
            if (err) reject(err);
            else resolve({ fd: fd, bytesRead: bytesRead, buffer: buffer });
        });
    });
}

export function fstat(fd: number): Promise<{ fd: number, stats: fs.Stats }> {
    return new Promise((resolve, reject) => {
        fs.fstat(fd, (err, stats) => {
            if (err) reject(err);
            else resolve({ fd: fd, stats: stats });
        });
    });
}

export function stat(path: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
        });
    });
}

export function readdir(dir: string): Promise< Array<{ name: string, nameLink: string, isFile: boolean, isDirectory: boolean }> > {
    return new Promise((resolve, reject) => {
        let results = [] as Array<{ name: string, nameLink: string, isFile: boolean, isDirectory: boolean }>;
        let pending: number;
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

export function getFileType(path: string): Promise<FileType> {
    return new Promise((resolve, reject) => {
        return fs.stat(path, (err, stats) => {
            if (err) {
                const errCodeNoSuchFileOrDirectory = "ENOENT";
                if (err.code === errCodeNoSuchFileOrDirectory) {
                    resolve(FileType.NotExists);
                }
                reject(err);
            } else {
                resolve(stats.isDirectory() ? FileType.IsDirectory
                    : stats.isFile() ? FileType.IsFile : FileType.Other);
            }
        });
    });
}

export function readFile(filename: string, options?: { encoding: string; flag?: string; }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, options, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

export function unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.unlink(path, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function fchown(fd: number, uid: number, gid: number) {
    return new Promise((resolve, reject) => {
        fs.fchown(fd, uid, gid, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function write(fd: number, data: Buffer|string, position?: number, encoding?: string) {
    return new Promise((resolve, reject) => {
        fs.write(fd, data, position, encoding, (err, written, str) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function mkdirp(dir: string, mode?: string) {
    return new Promise<void>((resolve, reject) => {
        mkdirpLib(dir, mode, function (err: any, made: string) {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function ftruncate(fd: number, len?: number) {
    return new Promise<void>((resolve, reject) => {
        fs.ftruncate(fd, len, (err: NodeJS.ErrnoException) => {
            if (err) reject(err);
            else resolve();
        });
    });
}