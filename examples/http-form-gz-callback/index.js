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
var bodyParser = require('body-parser');

const HOST = '0.0.0.0';
const PORT = process.env['PORT'] || 3000;
const UPLOAD_NAME = 'archive';
const PATH = process.env['CALLBACK_PATH'] || '/x/y/z';

if (PORT instanceof String) {
    PORT = parseInt(PORT);
}

var DUMP = function (name, json) {
    var text = prettyjson.render(json, { inlineArrays: false, defaultIndentation: 4 });
    var lines = text.split('\n');
    console.log(`\t${name.magenta}`);
    lines.forEach(l => {
        console.log(`\t${l}`);
    });
    console.log("\t--------");
};

var SHOW_REQUEST = function (purpose, req) {
    var { query, method, originalUrl, headers } = req;
    var size = req.headers['content-length'].toString();
    console.log(`multiparts-upload: ${method.red} ${originalUrl.yellow}: ${size.cyan} bytes`);
    DUMP("QUERY-STRING", query);
};

var PRETTY_PRINT_LINE = function (std, line) {
    var tokens = line.split('\n');
    var delimter = '\\n'.gray;
    if (std === "stderr") {
        return tokens.map(x => x.red).join(delimter);
    }
    else {
        return tokens.map(x => x.green).join(delimter);
    }
};

var upload = multer({ storage: multer.memoryStorage() });
var web = express();
web.set('trust proxy', true);

/**
 * Receive the execution results after the execution of BASH script is finished.
 */
web.put(PATH, upload.single(UPLOAD_NAME), (req, res) => {
    var { query, file } = req;
    var { task, profile, id } = query;
    var service = query['type'];
    var { fieldname, originalname, size, buffer } = file;
    SHOW_REQUEST("multiparts-upload", req);
    zlib.gunzip(buffer, (zerr, raw) => {
        if (zerr) {
            return console.log(`failed to decompress archive ${profile}/${id}/${service}/${task}, zerr: ${zerr}`);
        }
        console.log(`\tcompressed: ${size} bytes, decompressed: ${raw.length} bytes`);
        var text = raw.toString();
        var lines = text.split('\n');
        var outputs = [];
        lines.forEach(line => {
            var tokens = line.split('\t');
            if (tokens.length === 3) {
                var [timestamp, std, payload] = tokens;
                var time = moment(parseInt(timestamp)).format('MMM/DD HH:mm:ss.SSS');
                console.log(`\t${time.blue}\t${std.yellow}\t${payload.gray}`);
                if (std === "stdout" || std === "stderr") {
                    var buffer = Buffer.from(payload, 'hex');
                    var line = buffer.toString();
                    outputs.push(`${time.blue}\t${std}\t${PRETTY_PRINT_LINE(std, line)}`);
                }
            }
        });
        console.log("\t--------");
        outputs.forEach(element => {
            console.log(`\t${element}`);
        });
        console.log("");
    });
    res.status(200).end();
});

/**
 * Indicate the execution progress of one BASH script.
 */
web.post(PATH, bodyParser.json(), (req, res) => {
    var { query, body } = req;
    var { percentage } = body;
    percentage = percentage.toString();
    SHOW_REQUEST("progress-indication", req);
    DUMP("BODY", body);
    console.log("");
});

var server = http.createServer(web);
server.on('listening', () => {
    console.log(`listening ${HOST}:${PORT}`);
});
server.listen(PORT, HOST);
