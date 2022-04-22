#!/bin/sh

if [ -z "`ps -eaf | grep node  | grep webNotification`" ]; then
	echo "webNotification.js was not started."
else
	ps -eaf | grep node | grep webNotification | awk '{print $2}' |
	while read PID
	do
		echo "Killing $PID ..."
		kill -9 $PID
		echo
		echo "webNotification.js is being shutdowned."
	done
fi
