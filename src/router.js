import { Router } from 'express';
import ip from 'ip';

const router = Router();

router.get('/', (req, res) => {
	res.render('index');
});

router.get('/client', (req, res) => {
	res.render('client', { server: ip.address() });
});

router.post('/webNotification', (req, res) => {
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
			process.emit('notify', id, payload.data);
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

export default router;
