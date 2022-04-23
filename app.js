import express, { Router, json, static as _static, urlencoded } from 'express';
import { createServer } from 'https';
import { Server } from 'socket.io';
import { join, resolve } from 'path';
import cors from 'cors';
import createError from 'http-errors';
import fs from 'fs';

const __dirname = resolve();
const usernames = {};
const PORT = process.env.PORT || 8090;
const DATA_ENDPOINT = '/webNotification';
const [CONNECTION, CONNECT, DISCONNECT] = ['connection', 'connect', 'disconnect'];
const [ACCOUNT, CHAT, DATA, MESSAGE, ANNOUNCE, USERS] = ['account', 'chat', 'data', 'update.message', 'update.announce', 'update.users'];
const [FLAG_CONNECT, FLAG_DISCONNECT] = ['connect', 'disconnect'];

const router = Router()
	.get('/', (req, res) => {
		res.render('index');
	})
	.get('/client', (req, res) => {
		res.render('client', { endpoint: DATA_ENDPOINT });
	})
	.post(DATA_ENDPOINT, (req, res) => {
		let payload = {
			id: null,
			data: null,
		};

		console.log('webNotification received', req.body, req.params);

		if (req.body) {
			payload = req.body;
		} else {
			payload.id = req.params.id;
			payload.data = req.params.data;
		}

		if (payload.id) {
			payload.id.split(';').forEach((id) => {
				process.emit(DATA, id, payload.data);
			});

			res.json({
				responseHead: { resultCode: 0, resultMessage: 'SUCCESS' },
				responseData: { id: payload.id, data: payload.data },
			});
		} else {
			res.json({
				responseHead: { resultCode: 99, resultMessage: 'FAIL' },
				responseData: { id: payload.id, data: payload.data },
			});
		}
	});

const app = express()
	.set('views', join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.use(cors())
	.use(json())
	.use(urlencoded({ extended: true }))
	.use(_static(join(__dirname, 'public')))
	.use('/', router)
	.use((req, res, next) => {
		next(createError(404));
	})
	.use((err, req, res, next) => {
		// console.log(req.headers);
		const resErr = {
			isXhr: req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept.indexOf('json') > -1,
			status: err.status || 500,
			message: err.message || 'unknown error',
			stack: err.stack,
		};

		if (req.app.get('env') !== 'development') {
			resErr.stack = null;
		}

		if (resErr.status !== 404) {
			console.log('error', resErr);
		}

		if (resErr.isXhr) {
			res.status(resErr.status).json(resErr);
		} else {
			// set locals, only providing error in development
			res.locals.message = resErr.message;
			res.locals.error = resErr;
			res.status(resErr.status).render('error');
		}
	});

const options = {
	pfx: fs.readFileSync('certs/kamoru.jk.p12'),
	passphrase: '697489',
};

const httpServer = createServer(options, app)
	.listen(PORT)
	.on('error', (error) => {
		console.error('server error', error);
		if (error.syscall !== 'listen') {
			throw error;
		}
		// handle specific listen errors with friendly messages
		switch (error.code) {
			case 'EACCES':
				console.error(PORT + ' requires elevated privileges');
				process.exit(1);
			case 'EADDRINUSE':
				console.error(PORT + ' is already in use');
				process.exit(1);
			default:
				throw error;
		}
	})
	.on('listening', () => {
		const addr = httpServer.address();
		const env = app.get('env');
		console.log(`
  ####################################################
      socket.io Server
      ${JSON.stringify(addr)}
      env: ${env}
  ####################################################
    `);
	});

const io = new Server(httpServer).on(CONNECTION, function (socket) {
	console.log('incomming io connection', socket.id);

	socket.on(ACCOUNT, (username) => {
		const user = {
			id: socket.id,
			name: username,
			accessDate: Date.now(),
		};

		socket.user = user;
		socket.room = user.name;
		socket.join(user.name);
		usernames[username] = user;

		io.emit(USERS, usernames);
		socket.emit(ANNOUNCE, {
			flag: FLAG_CONNECT,
			user: user,
		});
		socket.broadcast.emit(ANNOUNCE, {
			flag: FLAG_CONNECT,
			user: user,
		});

		console.log(`connect [${socket.user.name}] total: ${Object.values(usernames).length}`);
	});

	socket.on(DISCONNECT, () => {
		delete usernames[socket.user.name];

		io.emit(USERS, usernames);
		socket.broadcast.emit(ANNOUNCE, {
			flag: FLAG_DISCONNECT,
			user: socket.user,
			time: Date.now(),
		});
		socket.leave(socket.room);

		console.log(`disconnect [${socket.user.name}] total: ${Object.values(usernames).length}`);
	});

	socket.on(CHAT, (message) => {
		io.emit(MESSAGE, socket.user.name, message, Date.now());
	});
});

process.on(DATA, (to, data) => {
	io.to(to).emit(DATA, to, data, Date.now());

	console.log('DATA to [' + to + '] ', data);
});
