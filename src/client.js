import $ from 'jquery';
import { io } from 'socket.io-client';
import axios from 'axios';
import './client.scss';

const DATA_ENDPOINT = '/webNotification';
const [CONNECTION, CONNECT, DISCONNECT] = ['connection', 'connect', 'disconnect'];
const [ACCOUNT, CHAT, DATA, MESSAGE, ANNOUNCE, USERS] = ['account', 'chat', 'data', 'update.message', 'update.announce', 'update.users'];
const [FLAG_CONNECT, FLAG_DISCONNECT] = ['connect', 'disconnect'];

let socket;

const connect = () => {
    const account = $('#account').val();
    if (!account) {
        return;
    }
    sessionStorage.setItem('account', account);

    // connect socket
    socket = io();

    // add listener
    socket
        .on(CONNECT, () => {
            console.log(CONNECT, 'by id', socket.id);
            socket.emit(ACCOUNT, account);
            $('#btnConnect').prop('disabled', true);
        })
        .on(DISCONNECT, () => {
            console.log(DISCONNECT, socket.id);
        })
        .on(USERS, (users) => {
            console.log(USERS, users);
            $('#users').empty();
            Object.values(users).forEach((user) => {
                $(`<li class="list-group-item d-flex justify-content-between align-items-center ${user.name === account ? 'active' : ''}">${user.name} <small>${new Date(user.accessDate).toLocaleTimeString()}</small></li>`)
                    .data('account', user.name)
                    .on('click', (e) => {
                        const newToId = $(e.target).data('account');
                        const prevToId = $('#toId').val();
                        let toIds = prevToId ? [...new Set(prevToId.split(',')).add(newToId)].join(',') : newToId;
                        $('#toId').val(toIds);
                    })
                    .appendTo($('#users'));
            });
        })
        .on(MESSAGE, (from, message, time) => {
            console.log(`${MESSAGE} from ${from} => ${message}`);
            $('#fromMessages').append(`
                <div class="alert alert-info m-1 p-2 w-75 ${account === from ? 'ms-auto' : ''}">
                    <div class="float-end"><small>${new Date(time).toLocaleTimeString()}</small></div>
                    <div>${account === from ? '' : from + ':'} ${message.replace(/[<>&'"]/g, function (c) {
                switch (c) {
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '&':
                        return '&amp;';
                    case "'":
                        return '&apos;';
                    case '"':
                        return '&quot;';
                }
            })}</div>
                </div>`);
            scrollLast();
        })
        .on(ANNOUNCE, (announcement) => {
            console.log(ANNOUNCE, announcement);
            let message;
            if (announcement.flag === FLAG_CONNECT) {
                if (announcement.user.name === account) {
                    message = '어서오세요';
                } else {
                    message = `${announcement.user.name}님이 들어오셨습니다.`;
                }
            } else if (announcement.flag === FLAG_DISCONNECT) {
                message = `${announcement.user.name}님이 나가셨습니다.`;
            } else {
                throw new Error('unknown flay. ' + announcement.flag);
            }
            $('#fromMessages').append(`<div class="alert alert-success w-75 m-1 p-2">${message}</div>`);
            scrollLast();
        })
        .on(DATA, (to, data, time) => {
            console.log(`${DATA} to ${to} => `, data);
            $('#fromNotify').prepend(`
                <div class="alert alert-success m-1 p-2">
                    <div class="float-end"><small>${new Date(time).toLocaleTimeString()}</small></div>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            `);
        });

    $('#chatSendBtn').on('click', () => {
        const chatText = $('#chatTextarea').val();
        if (chatText) {
            socket.emit(CHAT, chatText);
            $('#chatTextarea').val('');
        }
    });

    $('#chatTextarea').on('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $('#chatSendBtn').trigger('click');
            return false;
        }
    });
};

const sendData = () => {
    const id = $('#toId').val();
    const json = JSON.parse($('#toMessage').val().trim());
    if (id && json) {
        axios
            .post(DATA_ENDPOINT, {
                id: id,
                data: json,
            })
            .then((response) => {
                console.log('sendData result', response.data)
            });
    }
};

const scrollLast = () => {
    $('#fromMessages').animate({
        scrollTop: $('#fromMessages').height()
    }, 500);
};

// set previous account name
$('#account').val(sessionStorage.getItem('account') || '');
// connnect
$('#btnConnect').on('click', connect);
// data send
$('#btnSendData').on('click', sendData);
