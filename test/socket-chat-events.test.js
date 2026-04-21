const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const SocketHandler = require('../socket/socket');
const SocketValidation = require('../socket/validation');

function createMockHelper() {
    const calls = [];
    const clone = (obj) => JSON.parse(JSON.stringify(obj));

    const mock = {
        calls,
        enterChat: async (_io, _socket, data) => {
            calls.push(['enterChat', clone(data)]);
        },
        exitChat: (_io, _socket, data) => {
            calls.push(['exitChat', clone(data)]);
        },
        sendMessage: async (_io, _socket, data) => {
            calls.push(['sendMessage', clone(data)]);
        },
        disconnect: () => {},
        handleSocketError(socket, key, message, lang = null, disconnect = false) {
            socket.emit('error_message', {
                key,
                message: String(message),
                status: 400,
            });
            if (disconnect) {
                socket.disconnect(true);
            }
        },
    };
    return mock;
}

function defaultQuery(overrides = {}) {
    return {
        userId: '99',
        userType: 'user',
        name: 'Test User',
        lang: 'ar',
        deviceType: 'web',
        deviceId: 'test-device-id',
        ...overrides,
    };
}

describe('socket events: enter-chat, send-message, exit-chat', () => {
    let httpServer;
    let io;
    let port;
    let mockHelper;

    before(async () => {
        await new Promise((resolve, reject) => {
            httpServer = http.createServer();
            httpServer.listen(0, '127.0.0.1', () => {
                port = httpServer.address().port;
                resolve();
            });
            httpServer.on('error', reject);
        });

        io = new Server(httpServer, {
            cors: { origin: '*', methods: ['GET', 'POST'] },
        });

        mockHelper = createMockHelper();
        const handler = new SocketHandler(io, mockHelper, new SocketValidation(mockHelper));
        handler.socketConfig();
    });

    after((done) => {
        io.close(() => {
            httpServer.close(done);
        });
    });

    test('enter-chat يستدعي enterChat مع room_id صالح', async () => {
        mockHelper.calls.length = 0;

        const client = ioClient(`http://127.0.0.1:${port}`, {
            transports: ['websocket'],
            query: defaultQuery(),
        });

        await new Promise((resolve, reject) => {
            client.on('connect_error', reject);
            client.on('connect', resolve);
        });

        client.emit('enter-chat', { room_id: 42 });
        await new Promise((r) => setTimeout(r, 50));

        assert.deepStrictEqual(mockHelper.calls, [['enterChat', { room_id: 42 }]]);

        client.close();
    });

    test('send-message يستدعي sendMessage مع الحقول المطلوبة', async () => {
        mockHelper.calls.length = 0;

        const client = ioClient(`http://127.0.0.1:${port}`, {
            transports: ['websocket'],
            query: defaultQuery(),
        });

        await new Promise((resolve, reject) => {
            client.on('connect_error', reject);
            client.on('connect', resolve);
        });

        const payload = { room_id: 7, type: 'text', body: 'hello' };
        client.emit('send-message', payload);
        await new Promise((r) => setTimeout(r, 50));

        assert.deepStrictEqual(mockHelper.calls, [['sendMessage', payload]]);

        client.close();
    });

    test('exit-chat يستدعي exitChat', async () => {
        mockHelper.calls.length = 0;

        const client = ioClient(`http://127.0.0.1:${port}`, {
            transports: ['websocket'],
            query: defaultQuery(),
        });

        await new Promise((resolve, reject) => {
            client.on('connect_error', reject);
            client.on('connect', resolve);
        });

        client.emit('exit-chat', { room_id: 3 });
        await new Promise((r) => setTimeout(r, 50));

        assert.deepStrictEqual(mockHelper.calls, [['exitChat', { room_id: 3 }]]);

        client.close();
    });

    test('enter-chat مع room_id غير صالح يرسل error_message ولا يستدعي enterChat', async () => {
        mockHelper.calls.length = 0;

        const client = ioClient(`http://127.0.0.1:${port}`, {
            transports: ['websocket'],
            query: defaultQuery(),
        });

        await new Promise((resolve, reject) => {
            client.on('connect_error', reject);
            client.on('connect', resolve);
        });

        const errors = [];
        client.on('error_message', (e) => errors.push(e));

        client.emit('enter-chat', { room_id: 'not-a-number' });
        await new Promise((r) => setTimeout(r, 50));

        assert.strictEqual(mockHelper.calls.length, 0);
        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].key, 'fail');

        client.close();
    });
});
