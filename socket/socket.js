const SocketHelper     = require('./helper');
const SocketValidation = require('./validation');

class SocketHandler {
    constructor(io, socketHelper = null, socketValidation = null) {
        this._io               = io;
        this._socketHelper     = socketHelper || SocketHelper;
        this._socketValidation = socketValidation || new SocketValidation(this._socketHelper);
    }

    socketEvents() {
        this._io.on('connection', (socket) => {
            console.log('Socket connected:', socket.handshake.query);
            this._socketValidation.validate(socket);
            this._registerEventHandlers(socket);
        });
    }
    _registerEventHandlers(socket) {
        socket.on('enter-chat', (data) => {
            console.log("Enter Chat",data)
            if (!this._socketValidation._validateRoomId(socket, data)) return;
            this._socketHelper.enterChat(this._io, socket, data);
        });

        socket.on('send-message', (data) => {
            console.log('Send message:', data);
            if (!this._socketValidation.validateSendMessage(socket, data)) return;
            this._socketHelper.sendMessage(this._io, socket, data);
        });

        socket.on('exit-chat', (data) => {
            console.log('Exit chat:', data);
            if (!this._socketValidation._validateRoomId(socket, data)) return;
            this._socketHelper.exitChat(this._io, socket, data);
        });

        socket.on('start-call', (data) => {
            console.log('Start call:', data);
            this._socketHelper.startCall(this._io, socket, data);
        });

        socket.on('answer-call', (data) => {
            console.log('Answer call:', data);
            this._socketHelper.answerCall(this._io, socket, data);
        });

        socket.on('reject-call', (data) => {
            console.log('Reject call:', data);
            this._socketHelper.rejectCall(this._io, socket, data);
        });

        socket.on('return-from-call', (data) => {
            console.log('Return from call:', data);
            this._socketHelper.returnFromCall(this._io, socket, data);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this._socketHelper.disconnect(this._io, socket);
        });

    }

    socketConfig() {
        this.socketEvents();
    }
}

module.exports = SocketHandler;
