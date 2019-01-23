#!/usr/bin/env node
'use strict';

var http = require('http');
var util = require('util');
var zlib = require('zlib');
var colors = require('colors');
var express = require('express');
var multer = require('multer');
var prettyjson = require('prettyjson');

const HOST = '0.0.0.0';
const PORT = process.env['PORT'] || 3000;
const UPLOAD_NAME = 'archive';

var upload = multer({ storage: multer.memoryStorage() });

var web = express();
web.set('trust proxy', true);

web.post('/x/y/z', upload.single(UPLOAD_NAME), (req, res) => {
    var { query, file, params } = req;
    var { task, profile, id, service } = query;
    var { fieldname, originalname, size, buffer } = file;
    console.log(`multiparts-upload: ${req.originalUrl.yellow}: ${req.headers['content-length']} bytes`);
    zlib.gunzip(buffer, (zerr, raw) => {
        if (zerr) {
            return console.log(`failed to decompress archive ${profile}/${id}/${service}/${task}, zerr: ${zerr}`);
        }
        console.log(`\tcompressed: ${size} bytes, decompressed: ${raw.length} bytes`);
        var text = raw.toString();
        var lines = text.split('\n');
        lines.forEach(line => {
            var tokens = line.split('\t');
            if (tokens.length === 3) {
                var [timestamp, type, payload] = tokens;
                timestamp = new Date(parseInt(timestamp));
                console.log(`${timestamp}\t${type.yellow}\t${payload.gray}`);
            }
        });
        console.log(raw.toString());
    });
    res.status(200).end();
});

if (PORT instanceof String) {
    PORT = parseInt(PORT);
}

var server = http.createServer(web);
server.on('listening', () => {
    console.log(`listening ${HOST}:${PORT}`);
});
server.listen(PORT, HOST);