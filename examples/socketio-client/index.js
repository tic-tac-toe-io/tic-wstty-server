#!/usr/bin/env node
'use strict';

var colors = require('colors');
var sioc = require('socket.io-client');
var prettyjson = require('prettyjson');
var moment = require('moment');

var DUMP = function (name, json) {
    var text = prettyjson.render(json, { inlineArrays: false, defaultIndentation: 4 });
    var lines = text.split('\n');
    console.log(`\t${name.magenta}`);
    lines.forEach(l => {
        console.log(`\t${l}`);
    });
    console.log("\t--------");
};

var [node, script, url, username, password] = process.argv;

if (!url) {
    console.log('please specify url of Wstty server, e.g. https://tty.t2t.io');
    process.exit(1);
}

if (!username) {
    console.log('please specify user name as 2nd argument, e.g. admin');
    process.exit(1);
}

if (!password) {
    console.log('please specify password as 3rd argument, e.g. https://1234');
    process.exit(1);
}

var s = sioc(`${url}/system`);
s.on('connect', () => {
    console.log('connected!!');
    s.on('authenticated', () => {
        console.log('authenticated!!');
    });
    s.on('unauthorized', (err) => {
        console.log(`There was an error with the authentication:`, err);
        process.exit(2);
    });

    /**
     * Real-time agent status updates.
     */
    s.on('data', (payload) => {
        var {evt, data} = payload;
        if (evt == 'all-agents') {
            /**
             * The event is only emitted once, when the client is successfully
             * connected and authenticated to server. Server shall response
             * the list of all connected agents.
             */
            var agents = data;
            agents.forEach(a => {
                DUMP(`init:${a.id}`, a.system.ttt);
            });
        }
        else if (evt == 'agent-connected') {
            /**
             * The event is emitted when any agent is newly connected
             * after the event `all-agents`.
             */
            DUMP('connectd-agent', data);
        }
        else if (evt == 'agent-disconnected') {
            /**
             * The event is emitted when any connected agent is disconnected
             * after the event `all-agents`.
             */
            var {id} = data;
            console.log(`agent disconnected: ${id.yellow}`);
        }
    });
    s.emit('authentication', {username, password});
});
