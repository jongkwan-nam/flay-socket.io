#!/bin/sh

if [ -z "`ps -eaf | grep node | grep webNotification`" ]; then
	echo "webNotification.js is being started now..."
	nohup ./node forever start ./webNotification.js
else
	echo
	echo "webNotification.js already started"
fi
