/*

IMPORTS

 */

import {player, playSong} from "./player.js";
import {addToQueueNext, clearQueue, loadQueue, queue, queueIndex} from "./queue.js";
import {addToPlaylist, removeFromPlaylist, setContextMenu, showView} from "./backend.js";
import {getImage} from "./utils.js";

const fastdom = require('fastdom');

function showPlaylist(playlistId, browseId) {
    showView("playlistView");
    let queueArgs = {playlistId: playlistId, browseId: null};
    let cusColumn = "Album";
    const worker = new Worker('js/worker.js', {type: 'module'});
    if (playlistId != null) {
        worker.postMessage({func: "get_playlist", args: playlistId});
        queueArgs = {playlistId: playlistId, browseId: null};
    } else {
        worker.postMessage({func: "get_album", args: browseId});
        queueArgs = {playlistId: null, browseId: browseId};
        cusColumn = "Stats"
    }
    worker.onmessage = async (event) => {
        if (event.data.error) {
            console.error(event.data.error);
            return;
        }
        let playlist = event.data;
        const playlistView = document.getElementById('playlistView');
        playlistView.innerHTML = '';
        const playlistHeader = document.createElement('div');
        playlistHeader.classList.add('playlist-header');
        const playlistArt = document.createElement('img');
        playlistArt.src = getImage(playlist.thumbnails[playlist.thumbnails.length - 1].url);
        playlistArt.alt = playlist.title;
        playlistArt.classList.add('playlist-art');
        playlistHeader.appendChild(playlistArt);
        const playlistTitle = document.createElement('h1');
        playlistTitle.textContent = playlist.title;
        playlistHeader.appendChild(playlistTitle);
        playlistView.appendChild(playlistHeader);


        // Create table
        let playlistContainer = document.createElement('table');
        playlistContainer.classList.add('playlist-container');


        let headerRow = document.createElement('tr');

        let trackArtHeader = document.createElement('th');
        trackArtHeader.style.width = '1%';
        headerRow.appendChild(trackArtHeader);

        let trackInfoHeader = document.createElement('th');
        trackInfoHeader.style.width = '20%';
        trackInfoHeader.textContent = 'Song';
        headerRow.appendChild(trackInfoHeader);

        let trackAlbumHeader = document.createElement('th');
        trackAlbumHeader.style.width = '10%';
        trackAlbumHeader.textContent = cusColumn
        headerRow.appendChild(trackAlbumHeader);

        let trackDurationHeader = document.createElement('th');
        trackDurationHeader.style.width = '4%';
        trackDurationHeader.textContent = 'Duration';
        headerRow.appendChild(trackDurationHeader);

        let trackDateAddedHeader = document.createElement('th');
        trackDateAddedHeader.style.width = '4%';
        trackDateAddedHeader.textContent = ' ';
        headerRow.appendChild(trackDateAddedHeader);

        playlistContainer.appendChild(headerRow);

        playlist.tracks.forEach((track, index) => {
                if (!track.isAvailable) {
                    return;
                }
                let trackContainer = document.createElement('tr');
                trackContainer.classList.add('track-container');

                let trackArtCell = document.createElement('td');
                trackContainer.appendChild(trackArtCell);
                trackArtCell.classList.add('track-art-cell');

                let trackInfoCell = document.createElement('td');
                trackContainer.appendChild(trackInfoCell);
                trackInfoCell.classList.add('track-info-cell');

                let trackAlbumCell = document.createElement('td');
                trackContainer.appendChild(trackAlbumCell);
                trackAlbumCell.classList.add('track-album-cell');

                let trackDurationCell = document.createElement('td');
                trackContainer.appendChild(trackDurationCell);
                trackDurationCell.classList.add('track-duration-cell');

                let trackLikeCell = document.createElement('td');
                trackContainer.appendChild(trackLikeCell);
                trackLikeCell.classList.add('track-like-cell');

                setContextMenu(trackContainer, [{
                    title: "Play Next",
                    icon: "add",
                    onClick: () => {
                        addToQueueNext(track, true);
                    }
                }, {
                    title: "Add to queue",
                    icon: "add",
                    onClick: () => {
                        addToPlaylist(track.videoId);
                        if (queueIndex == 0 && queue.length == 0) {
                            queue[0] = player.active;
                        }

                        queue.push(track);
                    }
                }, {
                    title: "Add to Playlist",
                    icon: "add",
                    onClick: () => {
                        addToPlaylist(track.videoId);
                    }
                }, {
                    title: "Remove from this playlist",
                    icon: "add",
                    onClick: () => {
                        removeFromPlaylist(track.videoId, playlistId);
                    }
                }, {
                    title: "Go to song radio",
                    icon: "share",
                    onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }, {
                    title: "Go to album",
                    icon: "share",
                    onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }, {
                    title: "Share",
                    icon: "share",
                    onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }]);
                const trackArtCellDiv = document.createElement('div');
                const trackArt = document.createElement('img');
                if (track.thumbnails && track.thumbnails.length > 0 && track.thumbnails[track.thumbnails.length - 1].url) {
                    // Set the src attribute using the track thumbnail URL
                    trackArt.src = getImage(track.thumbnails[track.thumbnails.length - 1].url);
                } else if (playlist.thumbnails && playlist.thumbnails.length > 0 && playlist.thumbnails[playlist.thumbnails.length - 1].url) {
                    // Set the src attribute using the album thumbnail URL
                    trackArt.src = getImage(playlist.thumbnails[playlist.thumbnails.length - 1].url);
                }
                trackArtCellDiv.appendChild(trackArt);
                const actionButton = document.createElement('i');
                actionButton.classList.add('material-icons');
                actionButton.classList.add('track-art-action-button');
                if (player.active && player.videoId == track.videoId && player.active.playing()) {
                    actionButton.textContent = 'pause';
                } else {
                    actionButton.textContent = 'play_arrow';
                }
                trackArtCellDiv.appendChild(actionButton);
                trackArtCellDiv.classList.add('track-art-cell-div');
                trackArtCell.appendChild(trackArtCellDiv);

                trackContainer.playSongClick = (con) => {
                    actionButton.textContent = 'cached';
                    clearQueue(true);
                    loadQueue(queueArgs).then(() => {
                        queueIndex.value = index;
                        playSong(track.videoId, queueArgs.playlistId, queueArgs.browseId).then(() => {
                            let containers = document.querySelectorAll('.track-container');
                            containers.forEach(function (container) {
                                container.onclick = container.playSongClick(container);
                            });
                            actionButton.textContent = 'pause';
                            con.onclick = con.playSongClick(con);
                        });
                    });
                }

                trackContainer.trackId = track.videoId;
                trackContainer.onclick = () => {
                    if (trackContainer.trackId === player.videoId) {
                        if (player.active.playing()) {
                            fastdom.mutate(() => {
                                actionButton.textContent = 'play_arrow';
                            });
                            player.active.pause();
                        } else {
                            fastdom.mutate(() => {
                                actionButton.textContent = 'pause';
                            });
                            player.active.play();
                        }
                    } else {
                        actionButton.textContent = 'cached';
                        clearQueue(true);
                        loadQueue(queueArgs).then(() => {
                            queueIndex.value = index;
                            playSong(track.videoId, queueArgs.playlistId, queueArgs.browseId).then(() => {
                                fastdom.mutate(() => {
                                    let buttons = document.querySelectorAll('.track-art-action-button');
                                    buttons.forEach(function (button) {
                                        button.textContent = 'play_arrow';
                                    });

                                    let anyActionButtons = [];
                                    let trackContainers = document.querySelectorAll('.track-container');
                                    for (let i = 0; i < trackContainers.length; i++) {
                                        // Check if the track container has the specific video id
                                        if (trackContainers[i].trackId === player.videoId) {
                                            // Get the action button of the track container
                                            anyActionButtons.push(trackContainers[i].querySelector('.track-art-action-button'));
                                        }
                                    }
                                    anyActionButtons.forEach((button) => {
                                        button.textContent = 'pause';
                                    });
                                });
                            });
                        });
                    }
                }
                const trackTitle = document.createElement('h2');
                trackTitle.textContent = track.title;
                trackInfoCell.appendChild(trackTitle);
                const trackArtist = document.createElement('p');
                if (playlistId == null) {
                    track.artists = playlist.artists;
                }
                track.artists.forEach((artist) => {
                    trackArtist.textContent += artist.name;
                    if (track.artists.indexOf(artist) != track.artists.length - 1) {
                        trackArtist.textContent += ', ';
                    }
                });
                trackInfoCell.appendChild(trackArtist);
                if (track.album && track.album.name !== null) {
                    const trackAlbum = document.createElement('p');
                    trackAlbum.textContent = track.album.name;
                    trackAlbumCell.appendChild(trackAlbum);
                } else {
                    trackAlbumCell.textContent = 'Unknown Album';
                }
                const trackDuration = document.createElement('p');
                trackDuration.textContent = track.duration;
                trackDurationCell.appendChild(trackDuration);
                trackLikeCell.textContent = track.likeStatus;
                //const trackArtist = document.createElement('p');
                //trackArtist.textContent = track.artist.name;
                //trackContainer.appendChild(trackArtist);
                playlistContainer.appendChild(trackContainer);
            }
        )
        ;
        playlistView.appendChild(playlistContainer);
    }
}

function showAlbum(browseId) {
    showPlaylist(null, browseId)
}

export {
    showPlaylist,
    showAlbum
};