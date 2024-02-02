import {addToPlaylist, setContextMenu, showView} from "./backend.js";
import {player, playSong} from "./player.js";
import {getImage} from "./utils.js";
import {clearQueue, queue, queueIndex} from "./queue.js";

const {get_artist} = require("libmuse");

function showArtist(artistId) {
    showView("artistView");
    get_artist(artistId).then(artist => {
        console.log(artist);
        const artistView = document.getElementById('artistView');
        artistView.innerHTML = '';
        const artistHeader = document.createElement('div');
        artistHeader.classList.add('playlist-header');
        const artistArt = document.createElement('img');
        artistArt.src = getImage(artist.thumbnails[artist.thumbnails.length - 1].url);
        artistArt.alt = artist.name;
        artistArt.classList.add('playlist-art');
        artistHeader.appendChild(artistArt);
        const artistTitle = document.createElement('h2');
        artistTitle.textContent = artist.name;
        artistHeader.appendChild(artistTitle);
        artistView.appendChild(artistHeader);
        const artistContainer = document.createElement('div');
        artistContainer.classList.add('playlist-container');
        artist.songs.results.forEach((track) => {
            const trackContainer = document.createElement('div');
            trackContainer.classList.add('track-container');
            trackContainer.onclick = () => {
                clearQueue();
                playSong(track.videoId);
            }
            setContextMenu(trackContainer, [{
                title: "Play Next", icon: "add", onClick: () => {
                    addToPlaylist(item.videoId);
                    if (queueIndex == 0 && queue.length == 0) {
                        queue[0] = player.active;
                    }

                    queue.splice(queueIndex + 1, 0, track);
                }
            }, {
                title: "Add to queue", icon: "add", onClick: () => {
                    addToPlaylist(item.videoId);
                    if (queueIndex == 0 && queue.length == 0) {
                        queue[0] = player.active;
                    }

                    queue.push(track);
                }
            }, {
                title: "Add to Playlist", icon: "add", onClick: () => {
                    addToPlaylist(item.videoId);
                }
            }, {
                title: "Go to song radio", icon: "share", onClick: () => {
                    alert("Added to playlist");
                    //copy link and add notification
                }
            }, {
                title: "Go to album", icon: "share", onClick: () => {
                    alert("Added to playlist");
                    //copy link and add notification
                }
            }, {
                title: "Share", icon: "share", onClick: () => {
                    alert("Added to playlist");
                    //copy link and add notification
                }
            }]);
            const trackArt = document.createElement('img');
            trackArt.src = getImage(track.thumbnails[track.thumbnails.length - 1].url);
            trackArt.alt = track.title;
            trackArt.classList.add('track-art');
            trackContainer.appendChild(trackArt);
            const trackTitle = document.createElement('h2');
            trackTitle.textContent = track.title;
            trackContainer.appendChild(trackTitle);
            const trackArtist = document.createElement('p');
            track.artists.forEach((artist) => {
                trackArtist.textContent += artist.name;
                if (track.artists.indexOf(artist) != track.artists.length - 1) {
                    trackArtist.textContent += ', ';
                }
            });
            trackContainer.appendChild(trackArtist);
            artistContainer.appendChild(trackContainer);
        });
        artistView.appendChild(artistContainer);
    });
}

export {showArtist};