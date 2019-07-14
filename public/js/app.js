const socket = io();

// DOM elements
let $messageForm  = document.querySelector('#chat-form');
let $messageField = $messageForm.querySelector('input');
let $messageBut   = $messageForm.querySelector('button');
let $locationBut  = document.querySelector('#share-location-but');
let $messagesCont = document.querySelector('#messages');
let $sidebar      = document.querySelector('#sidebar');

// Templates
let messageTemplate         = document.querySelector('#message-template').innerHTML;
let locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
let sidebarTemplate         = document.querySelector('#sidebar-template').innerHTML;

// Query string
let userJoinData = Qs.parse(location.search, { ignoreQueryPrefix: true }); 

const autoscroll = () => {
    let $newMessage = $messagesCont.lastElementChild;

    let newMessageStyles = getComputedStyle($newMessage);
    let newMessageMargin = parseInt(newMessageStyles.marginBottom);
    let newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    let visibleHeight = $messagesCont.offsetHeight;
    let fullHeight    = $messagesCont.scrollHeight;

    let scrollOfsset = $messagesCont.scrollTop + visibleHeight;

    if (fullHeight - newMessageHeight <= scrollOfsset) {
        $messagesCont.scrollTop = fullHeight - visibleHeight;
    }
};

socket.emit('join', userJoinData, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});

socket.on('sidebarChanged', ({ room, users }) => {
    let html = Mustache.render(sidebarTemplate, {
        room,
        users
    });

    $sidebar.innerHTML = '';
    $sidebar.insertAdjacentHTML('beforeEnd', html);
});

socket.on('message', (message) => {
    let html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm')
    });

    $messagesCont.insertAdjacentHTML('beforeend', html);

    autoscroll();
});

socket.on('locationMessage', (message) => {
    let html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('HH:mm')
    });

    $messagesCont.insertAdjacentHTML('beforeend', html);

    autoscroll();
});

// Form submited
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let message = $messageField.value;
    $messageBut.setAttribute('disabled', 'disabled');

    // Send a message to the server
    socket.emit('messageSent', message, (error) => {
        $messageBut.removeAttribute('disabled');
        $messageField.focus();

        if (error) {
            return console.log(error);
        }

        $messageField.value = '';
        console.log('Message delivered!');
    });
});

// Location submited
$locationBut.addEventListener('click', (e) => {
    if (!navigator.geolocation) {
        return alert('Your browser doesn\' support the geolocation');
    }

    e.target.setAttribute('disabled', 'desabled');

    navigator.geolocation.getCurrentPosition((pos) => { 
        // Send location to the server
        socket.emit('locationSent', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
        }, (error) => {
            e.target.removeAttribute('disabled');

            if (error) {
                return console.log(error);
            }

            console.log('Location shared!');
        });
    });
});