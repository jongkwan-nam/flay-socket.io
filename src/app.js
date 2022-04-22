const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const querystring = require('querystring');
const { join } = require('path');

const portNumber = 8090;

const app = express();

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.get('/', (request, response) => {
	response.sendFile(join(__dirname, '../html/index.html'));
});
app.post('/webNotification', (request, response) => {
	let body = '';
	request.on('data', (data) => {
		body += data;
		if (body.length > 1e6) {
			request.socket.destroy();
		}
	});
	request.on('end', () => {
		const post = querystring.parse(body);
		const id = post['id'];
		const data = post['data'];
		if (id) {
			const empcodes = id.split(';');
			for (let i = 0; i < empcodes.length; i++) {
				process.emit('notify', empcodes[i], data);
			}
		}
		response.writeHead(200, { 'Content-Type': 'application/json' });
		const json = { responseHead: { resultCode: 0, resultMessage: 'SUCCESS' }, responseData: { id: id, data: data } };
		response.end(JSON.stringify(json));
	});
});

process.on('notify', function (roomname, data) {
	//	io.sockets.emit("updatemessage", "WebNotiServer", "notification..... !!!");
	io.to(roomname).emit('updatemessage', roomname, data);
	console.log('notify [->' + roomname + '] ' + data);
});

const httpServer = createServer(app);
const io = new Server(httpServer);
const usernames = {};
io.on('connection', function (socket) {
	console.log('io connection', socket.id);

	// when the client emits "sendchat", this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute "updatemessage" with 2 parameters
		io.emit('updatemessage', socket.username, data);
	});

	// when the client emits "adduser", this listens and executes
	socket.on('adduser', function (username) {
		// we store the username in the socket session for this client
		socket.username = username;
		// add the client"s username to the global list

		socket.room = username;
		usernames[username] = username;
		socket.join(username);

		socket.emit('updatemessage', 'WebNotiServer', 'you have connected');

		// echo globally (all clients) that a person has connected
		socket.broadcast.to(username).emit('updatemessage', 'WebNotiServer', username + ' has connected');

		// update the list of users in chat, client-side
		io.emit('updateusers', usernames);
		console.log(socket.username + '님이 입장하였습니다.');
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function () {
		// remove the username from global usernames list
		delete usernames[socket.username];

		// update list of users in chat, client-side
		io.emit('updateusers', usernames);

		// echo globally that this client has left
		//		socket.broadcast.emit("updatemessage", "WebNotiServer", socket.username + " has disconnected");
		socket.leave(socket.room);
		console.log(socket.username + ' disconnect. left ' + Object.values(usernames).length);
	});
});

// 서버 종료 이벤트
process.on('exit', function () {
	console.warn(`
	#############################################################
			socket.io Server shutdown
	#############################################################
	`);
});

httpServer.listen(portNumber, () => {
	console.log(`
	#############################################################
			socket.io Server start. Listening on ${portNumber}
	#############################################################
	`);
});
