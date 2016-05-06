/**
 * Developer: Alex Voronyansky <belirafon@gmail.com>
 * Date: 27.04.2016
 * Time: 15:37
 */

"use strict";

const AmiTestServer = require('asterisk-ami-test-server');
const AmiClient = require('../lib/AmiClient');
const AmiConnection = require('../node_modules/asterisk-ami-connector/lib/AmiConnection');
const assert = require('assert');

let serverOptions = {
        credentials: {
            username: 'test',
            secret: 'test'
        }
    },
    socketOptions = {
        host: '127.0.0.1',
        port: 5038
    };

describe('Ami Client internal functionality', function(){
    this.timeout(3000);

    let server = null,
        client = null;

    afterEach(done => {
        if(server instanceof AmiTestServer){
            server.close();
            server.removeAllListeners();
            server = null;
        }
        if(client instanceof AmiClient){
            client.disconnect();
            client = null;
        }
        setTimeout(done, 100);
    });

    describe('Regular connection with default configuration', function(){

        beforeEach(done => {
            client = new AmiClient();
            server = new AmiTestServer(serverOptions);
            server.listen({port: socketOptions.port}).then(done);
        });

        it('Connect with correct credentials', done => {
            client.connect('test', 'test', socketOptions).then(() => done());
        });

        it('Connector returns instance of AmiConnection', done => {
            client.connect('test', 'test', socketOptions).then(amiConnection => {
                assert.ok(amiConnection instanceof AmiConnection);
                done();
            });
        });

        it('Connect with invalid credentials', done => {
            client.connect('username', 'secret', socketOptions)
                .catch(error => {
                    assert.ok(error instanceof Error);
                    assert.equal('ami message: authentication failed', error.message.toLowerCase());
                    done();
                });
        });
    });

    describe('Reconnection functioanlity', function(){

        beforeEach(() => {
            server = new AmiTestServer(serverOptions);
        });

        it('Reconnection with correct credentials', done => {
            client = new AmiClient({
                reconnect: true
            });
            client.connect('test', 'test', socketOptions).then(() => done());
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        });

        it('Reconnection with invalid credentials', done => {
            client = new AmiClient({
                reconnect: true
            });
            client.connect('username', 'secret', socketOptions).catch(error => {
                assert.ok(error instanceof Error);
                assert.equal('ami message: authentication failed', error.message.toLowerCase());
                done();
            });
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        });

        it('Limit of attempts of reconnection', done => {
            client = new AmiClient({
                reconnect: true,
                maxAttemptsCount: 1
            });
            client.connect('test', 'test', socketOptions).catch(error => {
                assert.ok(error instanceof Error);
                assert.equal('reconnection error after max count attempts.', error.message.toLowerCase());
                done();
            });
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        });

        it('Ban for reconnection', done => {
            client = new AmiClient({
                reconnect: false
            });
            client.connect('test', 'test', socketOptions).catch(error => {
                assert.ok(error instanceof Error);
                assert.equal('connect ECONNREFUSED 127.0.0.1:5038', error.message);
                done();
            });
        });

        it('Reconnection after disconnect from Asterisk', done => {
            let wasDisconnect = false,
                connectCounter = 0;

            client = new AmiClient({
                reconnect: true,
                maxAttemptsCount: null,
                attemptsDelay: 1000
            });
            client
                .on('disconnect', () => {
                    wasDisconnect = true;
                })
                .on('connect', () => {
                    if(++connectCounter == 2 && wasDisconnect){
                        done();
                    }
                });

            server.listen({port: socketOptions.port}).then(() => {
                client.connect('test', 'test', socketOptions).then(() => {
                    server.close();
                    setTimeout(() => {
                        server.listen({port: socketOptions.port}).catch(error => console.log(error));
                    }, 1000);
                }).catch(error => console.log(error));
            }).catch(error => console.log(error));
        });
    });

});

