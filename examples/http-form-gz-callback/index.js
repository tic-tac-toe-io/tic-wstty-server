#!/usr/bin/env node
'use strict';

var http = require('http');
var util = require('util');
var zlib = require('zlib');
var colors = require('colors');
var express = require('express');
var multer = require('multer');
var prettyjson = require('prettyjson');
var moment = require('moment');

const HOST = '0.0.0.0';
const PORT = process.env['PORT'] || 3000;
const UPLOAD_NAME = 'archive';

var upload = multer({ storage: multer.memoryStorage() });

var web = express();
web.set('trust proxy', true);

web.post('/x/y/z', upload.single(UPLOAD_NAME), (req, res) => {
    var { query, file, params } = req;
    var { task, profile, id } = query;
	var service = query['type'];
    var { fieldname, originalname, size, buffer } = file;
    console.log(`multiparts-upload: ${req.originalUrl.yellow}: ${req.headers['content-length']} bytes`);
	console.log(`\tprofile = ${profile.magenta}`);
	console.log(`\tid = ${id.magenta}`);
	console.log(`\tservice = ${service.magenta}`);
	console.log(`\ttask = ${task.magenta}`);
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
				var time = moment(parseInt(timestamp)).format('MMM/DD HH:mm:ss.SSS');
                console.log(`${time.blue}\t${type.yellow}\t${payload.gray}`);
				if (type === "stdout" || type === "stderr") {
					var buffer = Buffer.from(payload, 'hex');
					var line = buffer.toString();
					console.log(`\t${line}`);
				}
            }
        });
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
