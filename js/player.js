/*

IMPORTS

 */
import {showArtist} from "./artist.js";
import {getImage} from "./utils.js";
import {
    addToMainQueue,
    loadQueue,
    moveItemInMainQueue,
    moveItemInQueue,
    queue,
    queueIndex,
    removeFromQueueNext
} from "./queue.js";
import {updatePresence} from "./backend.js";

const fastdom = require('fastdom');

const {Howl} = require('howler');
let player = {
    active: null,
    preloader: {
        player: null,
        videoId: null
    }
};

/*

VARIABLES

 */

async function playSong(videoId, playlistId, browseId) {
    return new Promise(async (resolve, reject) => {
        let volume = 0.5;
        const postFetch = async (song) => {
            fastdom.mutate(() => {
                const bottomPlayer = document.getElementById('bottomPlayerView');
                if (!bottomPlayer.classList.contains('active')) {
                    const contentView = document.getElementById('contentView');
                    const sidebarView = document.getElementById('sidebarView');
                    bottomPlayer.style.transition = "opacity 1s ease-in-out, height 1s ease-in-out";
                    contentView.style.transition = "height 1s ease-in-out";
                    sidebarView.style.transition = "height 1s ease-in-out";
                    bottomPlayer.classList.add('active');
                    setTimeout(() => {
                        bottomPlayer.style.transition = "";
                        contentView.style.transition = "";
                        sidebarView.style.transition = "";
                    }, 1000)
                    contentView.style.height = '82vh';
                    sidebarView.style.height = '82vh';
                }
                const albumArt = document.getElementById('albumArt');
                albumArt.src = getImage(song.videoDetails.thumbnail.thumbnails[song.videoDetails.thumbnail.thumbnails.length - 1].url);
                const songTitle = document.getElementById('songTitle');
                songTitle.textContent = metadata.title;
                const artistName = document.getElementById('artistName');
                artistName.textContent = metadata.artist;

                let anyActionButtons = [];
                let trackContainers = document.querySelectorAll('.track-container');
                for (let i = 0; i < trackContainers.length; i++) {
                    // Check if the track container has the specific video id
                    if (trackContainers[i].trackId === videoId) {
                        // Get the action button of the track container
                        anyActionButtons.push(trackContainers[i].querySelector('.track-art-action-button'));
                    }
                }

                let buttons = document.querySelectorAll('.track-art-action-button');
                fastdom.mutate(() => {
                    buttons.forEach(function (button) {
                        button.textContent = 'play_arrow';
                    });
                    anyActionButtons.forEach((button) => {
                        button.textContent = 'pause';
                    });
                });
            });

            while (document.getElementById('artistName').hasAttribute('onclick')) {
                document.getElementById('artistName').removeAttribute('onclick');
            }

            document.getElementById('artistName').addEventListener('click', () => {
                showArtist(song.videoDetails.channelId);
            });

            if (player.active != null) {
                volume = player.active.volume();
                player.active.stop();
                player.active.unload();
            }
            if (player.preloader.videoId === videoId) {
                player = player.preloader;
                player.active.volume(volume);
                resolve();
            } else {
                let selectedFormat = song.adaptive_formats.find(format => {
                    return (
                        format.codecs.toLowerCase() === 'mp4a.40.2' &&
                        (format.audio_quality?.toLowerCase() === 'high' || format.video_quality?.toLowerCase() === 'high')
                    );
                });

                if (!selectedFormat) {
                    selectedFormat = song.adaptive_formats.find(format => {
                        return (format.audio_quality?.toLowerCase() === 'high' || format.video_quality?.toLowerCase() === 'high');
                    });
                }
                const preferredFormat = selectedFormat || song.formats[0] || song.adaptive_formats[0];
                player.active = new Howl({
                    src: [preferredFormat.url],
                    html5: true,
                    onend: nextSong,
                    volume: volume,
                    preload: true,
                    onload: () => {
                        resolve();
                    },
                    onplay: updatePlayPauseButton,
                    onpause: updatePlayPauseButton,
                    onvolume: updateVolumeBar
                });
            }
            player.active.play();
            for (let key in song) {
                if (song.hasOwnProperty(key)) {
                    player[key] = song[key];
                }
            }
            player.videoId = videoId;
            player.playlistId = playlistId;
            player.browseId = browseId;

            setTimeout(updatePresence, 500);

            const metadata = {
                title: song.videoDetails.title,
                artist: song.videoDetails.author,
                album: "WIP",
                artwork: [{
                    src: getImage(song.videoDetails.thumbnail.thumbnails[song.videoDetails.thumbnail.thumbnails.length - 1].url)
                }]
            };

            if ('mediaSession' in window.navigator) {
                window.navigator.mediaSession.metadata = new MediaMetadata(metadata);
                window.navigator.mediaSession.setActionHandler('previoustrack', prevSong);
                window.navigator.mediaSession.setActionHandler('nexttrack', nextSong);
                navigator.mediaSession.setActionHandler('play', () => {
                    player.active.play();
                    updatePlayPauseButton();
                });
                navigator.mediaSession.setActionHandler('pause', () => {
                    player.active.pause();
                    updatePlayPauseButton();
                });
            }

            //LOAD QUEUE

            let isNewQueue = (queue.length === 0);
            if ((queue.length < 50 && (!playlistId && !browseId)) || (queue.length === 0 && (playlistId || browseId))) {
                if (isNewQueue) {
                    queueIndex.value = 0;
                    addToMainQueue(song.videoDetails, false);
                    moveItemInQueue(queue.length - 1, queueIndex.value, true);
                }
                if (!(queue.length > 0 && (playlistId || browseId))) {
                    await loadQueue({playlistId: playlistId, browseId: browseId});
                }
            }
            if (queueIndex.value !== 0 && queue[queueIndex.value].isQueueNext) {
                queue[queueIndex.value].isQueueNext = false;
                addToMainQueue(queue[queueIndex.value], false);
                removeFromQueueNext(0, false);
                moveItemInMainQueue(queue.length - 1, queueIndex.value, true);
            }

            fetch(song.playbackTracking.videostatsPlaybackUrl.baseUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    if (response.status === 204) {
                        //console.log('Playback Tracking Status: 204');
                    }
                })
                .catch(error => {
                    console.log('Error:', error);
                });
        }

        if (player.preloader.videoId === videoId) {
            postFetch(player.preloader);
        } else {
            const worker = new Worker('js/worker.js', {type: 'module'});
            worker.postMessage({func: "get_song", args: videoId});
            worker.onmessage = (event) => {
                if (event.data.error) {
                    console.error(event.data.error);
                    reject(event.data.error);
                    return;
                }
                let song = event.data;
                postFetch(song);
                worker.terminate();
            }
        }
    });
}


//TO ADD (MAKE OFFSET FROM MOUSE WHATEVER THE INITAL OFFSET ON CLICK WAS

const durationInner = document.getElementById('duration-inner');
const durationOuter = document.getElementById('duration-outer');
const seekHandleDuration = document.getElementById('seekHandle'); // Duration slider handle

const volumeInner = document.getElementById('volume-inner');
const volumeOuter = document.getElementById('volume-outer');
const seekHandleVolume = document.getElementById('volSeekHandle'); // Volume slider handle

let isDraggingDuration = false;
let isDraggingVolume = false;

seekHandleDuration.onmousedown = startDraggingDuration;
durationOuter.onclick = seekPlayer;
durationInner.onclick = seekPlayer;

seekHandleVolume.onmousedown = startDraggingVolume;
volumeOuter.onclick = adjustVolume;
volumeInner.onclick = adjustVolume;


function updateDurationBar() {
    setInterval(() => {
        if (!isDraggingDuration && player.active && player.active.playing()) {
            const percentage = (player.active.seek() / player.active.duration()) * 100;
            fastdom.mutate(() => {
                durationInner.style.width = percentage + '%';
                const handlePosition = (percentage / 100) * durationOuter.clientWidth;
                seekHandleDuration.style.left = handlePosition + 'px';
            });
        }
    }, 300); // Update every 300ms
}

updateDurationBar();

function seekPlayer(event) {
    if (!isDraggingDuration && (event.target === durationOuter || event.target === durationInner)) {
        const clickPosition = event.clientX - durationOuter.getBoundingClientRect().left;
        const percentageClicked = (clickPosition / durationOuter.clientWidth) * 100;
        player.active.seek((percentageClicked / 100) * player.active.duration());
    }
}


function startDraggingDuration(event) {
    event.preventDefault();
    isDraggingDuration = true;

    const handleRect = seekHandleDuration.getBoundingClientRect();
    const handleLeftOffset = event.clientX - handleRect.left;

    let newAudTime = player.active.seek();

    function handleDrag(moveEvent) {
        const newLeft = moveEvent.clientX - durationOuter.getBoundingClientRect().left - handleLeftOffset;
        const minLeft = 0;
        const maxLeft = durationOuter.clientWidth;
        const boundedLeft = Math.min(Math.max(newLeft, minLeft), maxLeft);

        const percentageDragged = (boundedLeft / durationOuter.clientWidth) * 100;

        if (percentageDragged >= 0 && percentageDragged <= 100) {
            newAudTime = (percentageDragged / 100) * player.active.duration();
        }
        fastdom.mutate(() => {
            durationInner.style.width = percentageDragged + '%';
            const handlePosition = (percentageDragged / 100) * durationOuter.clientWidth;
            seekHandleDuration.style.left = handlePosition + 'px';
        });
    }

    function handleDragEnd() {
        isDraggingDuration = false;
        player.active.seek(newAudTime);
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
    }

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
}

function updateVolumeBar() {
    if (!isDraggingVolume) {
        const percentage = player.active.volume * 100;
        fastdom.mutate(() => {
            volumeInner.style.width = percentage + '%';
            const handlePosition = (percentage / 100) * volumeOuter.clientWidth;
            seekHandleVolume.style.left = handlePosition + 'px';
        });
    }
}


function adjustVolume(event) {
    if (!isDraggingVolume && (event.target === volumeOuter || event.target === volumeInner)) {
        const clickPosition = event.clientX - volumeOuter.getBoundingClientRect().left;
        const percentageClicked = (clickPosition / volumeOuter.clientWidth) * 100;
        player.active.volume(percentageClicked / 100);
    }
}

function startDraggingVolume(event) {
    event.preventDefault();
    isDraggingVolume = true;

    const handleRect = seekHandleVolume.getBoundingClientRect();
    const handleLeftOffset = event.clientX - handleRect.left;

    let newVolume = player.active.volume;

    function handleDrag(moveEvent) {
        const newLeft = moveEvent.clientX - volumeOuter.getBoundingClientRect().left - handleLeftOffset;
        const minLeft = 0;
        const maxLeft = volumeOuter.clientWidth;
        const boundedLeft = Math.min(Math.max(newLeft, minLeft), maxLeft);

        const percentageDragged = (boundedLeft / volumeOuter.clientWidth) * 100;

        if (percentageDragged >= 0 && percentageDragged <= 100) {
            newVolume = percentageDragged / 100;
        }

        fastdom.mutate(() => {
            volumeInner.style.width = percentageDragged + '%';
            const handlePosition = (percentageDragged / 100) * volumeOuter.clientWidth;
            seekHandleVolume.style.left = handlePosition + 'px';
        });
        player.active.volume(percentageDragged / 100);
    }

    function handleDragEnd() {
        isDraggingVolume = false;
        player.active.volume(newVolume);
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
    }

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
}

//preloads audio (will be entirely replaced fo sho)
setInterval(async () => {
    if (queue[queueIndex.value + 1]) {
        let videoId = queue[queueIndex.value + 1].videoId;
        if (videoId !== player.preloader.videoId) {
            const worker = new Worker('js/worker.js', {type: 'module'});
            worker.postMessage({func: "get_song", args: videoId});
            worker.onmessage = async (event) => {
                if (event.data.error) {
                    console.error(event.data.error);
                    return;
                }
                let song = event.data;
                worker.terminate();

                // Check if there is a format with mp4a codec and audio_quality as "high"
                let selectedFormat = song.adaptive_formats.find(format => {
                    return (
                        format.codecs.toLowerCase() === 'mp4a.40.2' &&
                        (format.audio_quality?.toLowerCase() === 'high' || format.video_quality?.toLowerCase() === 'high')
                    );
                });

                if (!selectedFormat) {
                    selectedFormat = song.adaptive_formats.find(format => {
                        return (format.audio_quality?.toLowerCase() === 'high' || format.video_quality?.toLowerCase() === 'high');
                    });
                }


                // If mp4a format with "high" audio quality exists, use it; otherwise, use the first format
                const preferredFormat = selectedFormat || song.formats[0] || song.adaptive_formats[0];
                //preloadAudio.src = preferredFormat.url;
                //preloadedTrack = song;
                player.preloader.active = new Howl({
                    src: [preferredFormat.url],
                    html5: true,
                    preload: true,
                    onend: nextSong,
                    onplay: updatePlayPauseButton,
                    onpause: updatePlayPauseButton,
                    onvolume: updateVolumeBar
                });
                for (let key in song) {
                    if (song.hasOwnProperty(key)) {
                        player.preloader[key] = song[key];
                    }
                }
                player.preloader.videoId = song.videoDetails.videoId;
                player.preloader.preloader = {
                    player: null,
                    videoId: null
                }
                console.log("Preloaded song: " + song.videoDetails.title);
            }
        }
    }
}, 5000);


// Get the play/pause button element from the document
const playPauseButton = document.getElementById('playPauseButton');

// Add an event listener to the play/pause button that plays or pauses the audio when clicked
playPauseButton.addEventListener('click', togglePlayPause);

function togglePlayPause() {
    if (!player.active.playing()) {
        player.active.play();
        //playPauseButton.innerHTML = '<i class="material-icons">pause</i>';
    } else {
        player.active.pause();
        //playPauseButton.innerHTML = '<i class="material-icons">play_arrow</i>';
    }
    updatePlayPauseButton();
}

function updatePlayPauseButton() {
    let anyActionButtons = [];
    let trackContainers = document.querySelectorAll('.track-container');
    for (let i = 0; i < trackContainers.length; i++) {
        // Check if the track container has the specific video id
        if (trackContainers[i].trackId === player.videoId) {
            // Get the action button of the track container
            anyActionButtons.push(trackContainers[i].querySelector('.track-art-action-button'));
        }
    }
    if (!player.active.playing()) {
        fastdom.mutate(() => {
            anyActionButtons.forEach((button) => {
                button.textContent = 'play_arrow';
            });
            playPauseButton.innerHTML = '<i class="material-icons">play_arrow</i>';
        });
    } else {
        fastdom.mutate(() => {
            anyActionButtons.forEach((button) => {
                button.textContent = 'pause';
            });
            playPauseButton.innerHTML = '<i class="material-icons">pause</i>';
        });
    }

}

// Get the next button element from the document
const nextButton = document.getElementById('nextButton');

// Add an event listener to the next button that plays the next song when clicked
nextButton.addEventListener('click', function () {
    nextSong();
});

// Get the previous button element from the document
const prevButton = document.getElementById('prevButton');

// Add an event listener to the previous button that plays the previous song when clicked
prevButton.addEventListener('click', function () {
    prevSong();
});

let block = false;

function nextSong() {
    if (!block && queue[queueIndex.value + 1]) {
        block = true;
        queueIndex.value++;
        playSong(queue[queueIndex.value].videoId, queue[queueIndex.value].playlistId, queue[queueIndex.value].browseId).then(() => {
            block = false;
        });
    }
}

function prevSong() {
    if (!block && queue[queueIndex.value - 1]) {
        block = true;
        queueIndex.value--;
        playSong(queue[queueIndex.value].videoId, queue[queueIndex.value].playlistId, queue[queueIndex.value].browseId).then(() => {
            block = false;
        });
    }
}

export {
    playSong,
    nextSong,
    prevSong,
    player
};