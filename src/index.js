const express  = require('express');
const path     = require('path');
const http     = require('http');
const socketio = require('socket.io');
const Filter   = require('bad-words');
const {
    sendMessage,
    generateLocationMessage
} = require('./utils/messages');   
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./utils/users');

// Create express app, connect it to the http server as well as socket
const app    = express();
const server = http.createServer(app);
const io     = socketio(server);

const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// Waiting for connection
io.on('connection', (socket) => {
    console.log('Someone connect...');

    // Waiting for user to join
    socket.on('join', ({ username, room }, callback) => {
        let { user, error } = addUser({
            id: socket.id,
            username,
            room
        });

        if (error) {
            return callback(error);
        }

        callback();
        socket.join(user.room);

        io.to(user.room).emit('sidebarChanged', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        socket.emit('message', sendMessage('System message', `Welcome, ${user.username}!`));
        socket.broadcast.to(user.room).emit('message', sendMessage('System message',
            `${user.username} has joined!`));
    });

    // Waiting for message to be sent from a client
    socket.on('messageSent', (message, callback) => {
        let user = getUser(socket.id);
        
        if (!user) {
            return callback('Unknown user');
        }

        let filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('No profane language!');
        }

        callback();
        io.to(user.room).emit('message', sendMessage(user.username, message));
    });

    // Waiting for location to be sent from a client
    socket.on('locationSent', ({ latitude, longitude } = {}, callback) => {
        let user = getUser(socket.id);
        
        if (!user) {
            return callback('Unknown user');
        }

        if (!(latitude && longitude)) {
            return callback('No location detected!');
        }

        callback();
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,
                `https://google.com/maps?q=${latitude},${longitude}`));
    });

    // Waiting for a client to go
    socket.on('disconnect', () => {
        let user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('sidebarChanged', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });

            io.to(user.room).emit('message', sendMessage('System message',
                `${user.username} has left!`));   
        }
    });
});

server.listen(port, () => {
    console.log(`Server started on port ${port}...`);
})