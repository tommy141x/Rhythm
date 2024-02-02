/*

IMPORTS

 */
import {getImage, shuffleArray} from "./utils.js";
import {player, playSong} from "./player.js";
import {showView} from "./backend.js";
import {homeData} from "./home.js";
/*

VARIABLES

 */

let queue = [];
export let queueIndex = {value: 0};
export let shuffle = {value: false};
let mainQueue = [];
let nextQueue = [];

// MAIN FUNCTIONS
async function loadQueue({playlistId, browseId}) {
    return new Promise((resolve, reject) => {
        let shouldShuffle = (shuffle.value && mainQueue.length === 0);
        if (playlistId != null) {
            console.log("Loading playlist: " + playlistId + " into queue.");
            const worker = new Worker('js/worker.js', {type: 'module'});
            worker.postMessage({func: "get_playlist", args: playlistId});
            worker.onmessage = (event) => {
                if (event.data.error) {
                    console.error(event.data.error);
                    return;
                }
                let playlist = event.data;
                playlist.tracks.forEach((track, index) => {
                    track.playlistId = playlistId;
                    track.browseId = browseId;
                    addToMainQueue(track, false);
                });
                if (shouldShuffle) {
                    mainQueue = shuffleArray(mainQueue);
                }
                updateQueue();
                resolve();
            }
        } else if (browseId != null) {
            console.log("Loading album: " + browseId + " into queue.");
            const worker = new Worker('js/worker.js', {type: 'module'});
            worker.postMessage({func: "get_album", args: browseId});
            worker.onmessage = (event) => {
                if (event.data.error) {
                    console.error(event.data.error);
                    return;
                }
                let album = event.data;
                album.tracks.forEach((track, index) => {
                    track.playlistId = playlistId;
                    track.browseId = browseId;
                    addToMainQueue(track, false);
                });
                if (shouldShuffle) {
                    mainQueue = shuffleArray(mainQueue);
                }
                updateQueue();
                resolve();
            }
        } else {
            console.log("Loading home data into queue.");
            let freqSongs = [];
            homeData.results.forEach(result => {
                result.contents.forEach(track => {
                    if (track.type === "song" || track.type === "inline-video") {
                        track.playlistId = playlistId;
                        track.browseId = browseId;
                        freqSongs.push(track);
                    }
                });
            });
            freqSongs = shuffleArray(freqSongs);
            freqSongs.forEach(track => {
                addToMainQueue(track, false);
            });
            if (shouldShuffle) {
                mainQueue = shuffleArray(mainQueue);
            }
            updateQueue();
            resolve();
        }
    });
}

function updateQueue() {
    queue = mainQueue.slice();
    queue.splice(queueIndex.value + 1, 0, ...nextQueue);
}

function moveItemInQueue(from, to) {
    const totalQueueLength = mainQueue.length + nextQueue.length;
    const isFromInNextQueue = from >= 0 && from < nextQueue.length;
    const isToInNextQueue = to >= 0 && to < nextQueue.length;
    const isFromInMainQueue = from >= nextQueue.length && from < totalQueueLength;
    const isToInMainQueue = to >= nextQueue.length && to < totalQueueLength;

    if (isFromInNextQueue && isToInNextQueue) {
        moveItemInQueueNext(from, to, false);
    } else if (isFromInMainQueue && isToInMainQueue) {
        moveItemInMainQueue(from - nextQueue.length, to - nextQueue.length, false);
    } else if (isFromInNextQueue && isToInMainQueue) {
        addToMainQueue(nextQueue[from], false);
        moveItemInMainQueue(mainQueue.length - 1, to - nextQueue.length + 1, false);
        removeFromQueueNext(from, false);
    } else if (isFromInMainQueue && isToInNextQueue) {
        addToQueueNext(mainQueue[from - nextQueue.length], false);
        moveItemInQueueNext(nextQueue.length - 1, to, false);
        removeFromMainQueue(from - nextQueue.length + 1, false);
    }
    updateQueue();
}

function removeItemFromQueue(index) {
    const isIndexInNextQueue = index >= 0 && index < nextQueue.length;

    if (isIndexInNextQueue) {
        removeFromQueueNext(index, false);
    } else {
        removeFromMainQueue(index - nextQueue.length, false);
    }
    updateQueue();

}

function setQueueIndex(index) {
    queueIndex = index;
}

function clearQueue(shouldUpdate) {
    clearNextQueue(false);
    clearMainQueue(false);
    if (shouldUpdate) {
        updateQueue();
    }
}

function clearNextQueue(shouldUpdate) {
    nextQueue = [];
    if (shouldUpdate) {
        updateQueue();
    }
}

function clearMainQueue(shouldUpdate) {
    mainQueue = [];
    if (shouldUpdate) {
        updateQueue();
    }
}

// NEXT QUEUE
function addToQueueNext(track, shouldUpdate) {
    track.isQueueNext = true;
    nextQueue.push(track);
    if (shouldUpdate) {
        updateQueue();
    }
}

function removeFromQueueNext(index, shouldUpdate) {
    if (index >= 0 && index < nextQueue.length) {
        nextQueue.splice(index, 1);
    }
    if (shouldUpdate) {
        updateQueue();
    }
}

function moveItemInQueueNext(from, to, shouldUpdate) {
    // Move item from 'from' index to 'to' index in nextQueue
    if (from >= 0 && from < nextQueue.length && to >= 0 && to < nextQueue.length) {
        const [removed] = nextQueue.splice(from, 1); // Remove item from 'from' index
        nextQueue.splice(to, 0, removed); // Insert the removed item at 'to' index

        // Adjust current track index if it's affected by the move operation
        if (from < queueIndex && to >= queueIndex) {
            queueIndex--;
        } else if (from > queueIndex && to <= queueIndex) {
            queueIndex++;
        }
    }
    if (shouldUpdate) {
        updateQueue();
    }
}

// MAIN QUEUE
function addToMainQueue(track, shouldUpdate) {
    mainQueue.push(track);
    if (shouldUpdate) {
        updateQueue();
    }
}

function shuffleMainQueue(shouldUpdate) {
    shuffleArray(mainQueue);
    if (shouldUpdate) {
        updateQueue();
    }
}

function removeFromMainQueue(index, shouldUpdate) {
    if (index >= 0 && index < mainQueue.length) {
        mainQueue.splice(index, 1);
    }
    if (shouldUpdate) {
        updateQueue();
    }
}

function moveItemInMainQueue(from, to, shouldUpdate) {
    // Move item from 'from' index to 'to' index in mainQueue
    if (from >= 0 && from < mainQueue.length && to >= 0 && to < mainQueue.length) {
        const [removed] = mainQueue.splice(from, 1); // Remove item from 'from' index
        mainQueue.splice(to, 0, removed); // Insert the removed item at 'to' index

        // Adjust current track index if it's affected by the move operation
        if (from < queueIndex && to >= queueIndex) {
            queueIndex--;
        } else if (from > queueIndex && to <= queueIndex) {
            queueIndex++;
        }
    }
    if (shouldUpdate) {
        updateQueue();
    }
}


function showDetails() {
    showView("detailView");
    const detailView = document.getElementById('detailView');
    detailView.innerHTML = '';
    const detailHeader = document.createElement('div');
    detailHeader.classList.add('detail-header');
    const detailArt = document.createElement('img');
    detailArt.src = getImage(player.videoDetails.thumbnail.thumbnails[player.videoDetails.thumbnail.thumbnails.length - 1].url);
    detailArt.alt = player.active.title;
    detailArt.classList.add('detail-art');
    detailHeader.appendChild(detailArt);
    const detailTitle = document.createElement('h2');
    detailTitle.textContent = player.active.title;
    detailHeader.appendChild(detailTitle);
    detailView.appendChild(detailHeader);
    const detailContainer = document.createElement('div');
    detailContainer.classList.add('details-container');
    queue.forEach((track, index) => {
        const trackContainer = document.createElement('div');
        trackContainer.classList.add('detail-queue-container');
        const infoCon = document.createElement('div');
        infoCon.classList.add('left-info-container');
        const infoContainer = document.createElement('div');
        infoContainer.classList.add('info-container');
        trackContainer.onclick = () => {
            queueIndex.value = index;
            playSong(track.videoId);
        }
        if (index === queueIndex.value) {
            trackContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        }
        const trackArt = document.createElement('img');
        if (track.thumbnails && track.thumbnails) {
            trackArt.src = getImage(track.thumbnails[track.thumbnails.length - 1].url);
        } else if (track.videoDetails && track.videoDetails.thumbnails) {
            trackArt.src = getImage(track.videoDetails.thumbnails[track.videoDetails.thumbnails.length - 1].url);
        } else if (track.thumbnail && track.thumbnail.thumbnails) {
            trackArt.src = getImage(track.thumbnail.thumbnails[track.thumbnail.thumbnails.length - 1].url);
        }

        trackArt.alt = track.title;
        trackArt.classList.add('track-art');
        trackContainer.appendChild(trackArt);
        const trackTitle = document.createElement('h2');
        trackTitle.textContent = track.title;
        infoContainer.appendChild(trackTitle);
        const trackArtist = document.createElement('p');
        trackArtist.textContent = track.author;
        infoContainer.appendChild(trackArtist);
        infoCon.appendChild(trackArt);
        infoCon.appendChild(infoContainer);
        const trackDuration = document.createElement('p');
        trackDuration.textContent = track.lengthSeconds;
        trackContainer.appendChild(infoCon);
        trackContainer.appendChild(trackDuration);
        detailContainer.appendChild(trackContainer);
    });
    detailView.appendChild(detailContainer);
}


export {
    showDetails,
    clearQueue,
    clearNextQueue,
    clearMainQueue,
    removeItemFromQueue,
    removeFromQueueNext,
    addToQueueNext,
    moveItemInMainQueue,
    addToMainQueue,
    moveItemInQueue,
    shuffleMainQueue,
    loadQueue,
    queue,
};