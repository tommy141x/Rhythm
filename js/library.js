/*

IMPORTS

 */
import {playSong} from "./player.js";
import {showAlbum, showPlaylist} from "./playlist.js";
import {showArtist} from "./artist.js";
import {clearQueue} from "./queue.js";
import {addToPlaylist, loadQueue, setContextMenu} from "./backend.js";
import {getImage} from "./utils.js";

/*

VARIABLES

 */
let libraryData = null;

async function loadLibraryView() {
    const worker = new Worker('js/worker.js', {type: 'module'});
    worker.postMessage({func: "get_library", args: undefined});
    worker.onmessage = async (event) => {
        if (event.data.error) {
            console.error(event.data.error);
            setTimeout(loadLibraryView, 1000);
            return;
        }
        libraryData = event.data;
        const libraryView = document.getElementById('libraryView');
        libraryView.innerHTML = '';
        const section = document.createElement('div');
        section.classList.add('section');
        libraryData.results.forEach((item) => {
            // Create a container div for each item
            const subItemContainer = document.createElement('div');
            subItemContainer.classList.add('sub-item-container');
            if (item.type == "artist") {
                setContextMenu(subItemContainer, [{
                    title: "Follow", icon: "add", onClick: () => {
                        addToPlaylist(item.videoId);
                    }
                }, {
                    title: "Play Artist Radio", icon: "add", onClick: () => {
                        alert("Added to playlist");
                        //add to library
                    }
                }, {
                    title: "Share", icon: "share", onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }]);
            } else if (item.type == "album") {
                setContextMenu(subItemContainer, [{
                    title: "Add to Library", icon: "add", onClick: () => {
                        alert("Added to playlist");
                        //add to library
                    }
                }, {
                    title: "Share", icon: "share", onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }]);
            } else if (item.type == "playlist") {
                setContextMenu(subItemContainer, [{
                    title: "Edit details", icon: "add", onClick: () => {
                        alert("Added to playlist");
                        //add to library
                    }
                }, {
                    title: "Delete", icon: "share", onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }, {
                    title: "Share", icon: "share", onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }]);
            } else if (item.type == "song") {
                setContextMenu(subItemContainer, [{
                    title: "Add to Playlist", icon: "add", onClick: () => {
                        addToPlaylist(item.videoId);
                    }
                }, {
                    title: "Add to Library", icon: "add", onClick: () => {
                        alert("Added to playlist");
                        //add to library
                    }
                }, {
                    title: "Share", icon: "share", onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }]);
            }

            // Check if there is at least one thumbnail
            if (item.thumbnails && item.thumbnails.length > 0) {
                // Create an image element for the thumbnail
                const thumbnailImg = document.createElement('img');
                thumbnailImg.src = getImage(item.thumbnails[item.thumbnails.length - 1].url);
                thumbnailImg.alt = item.title;
                thumbnailImg.classList.add('home-art');

                // Append the thumbnail to the container
                subItemContainer.appendChild(thumbnailImg);
            }

            subItemContainer.addEventListener('click', function () {
                if (item.type == "playlist") {
                    showPlaylist(item.playlistId)
                } else if (item.type == "song") {
                    clearQueue(true);
                    playSong(item.videoId);
                } else if (item.type == "album") {
                    showAlbum(item.browseId);
                } else if (item.type == "artist") {
                    showArtist(item.browseId);
                }
            });

            // Create a heading element for the title
            const titleHeading = document.createElement('h2');
            titleHeading.classList.add('home-song-title');
            if (item.title) {
                titleHeading.textContent = item.title;
            } else if (item.name) {
                titleHeading.textContent = item.name;
            } else {
                console.log(item);
            }

            // Create a paragraph element for the subtitle
            const subtitlePara = document.createElement('p');
            subtitlePara.classList.add('home-song-desc');
            subtitlePara.textContent = item.description;

            // Append the title and subtitle to the container
            subItemContainer.appendChild(titleHeading);
            subItemContainer.appendChild(subtitlePara);
            section.appendChild(subItemContainer);

            //SIDEBAR VVV
            if (item.type == "playlist") {
                const sidebar = document.getElementById('sidebarView');
                const button = document.createElement('button');
                button.className = 'sidebar-button playlist-button';
                button.onclick = () => showPlaylist(item.playlistId); // Replace showPlaylist with your function

                const thumbnail = item.thumbnails && item.thumbnails[item.thumbnails.length - 1];
                if (thumbnail) {
                    const img = document.createElement('img');
                    img.src = getImage(thumbnail.url);
                    img.alt = item.title;
                    img.width = thumbnail.width;
                    img.height = thumbnail.height;
                    img.classList.add('sidebar-art');
                    button.appendChild(img);
                }

                setContextMenu(button, [{
                    title: "Edit details", icon: "add", onClick: () => {
                        addToPlaylist(item.videoId);
                    }
                }, {
                    title: "Delete", icon: "add", onClick: () => {
                        alert("Added to playlist");
                        //add to library
                    }
                }, {
                    title: "Share", icon: "share", onClick: () => {
                        alert("Added to playlist");
                        //copy link and add notification
                    }
                }]);


                const title = document.createElement('span');
                title.textContent = item.title;
                button.appendChild(title);

                sidebar.appendChild(button);
            }
        });
        libraryView.appendChild(section);
        loadQueue.library = true;
    }
}

export {loadLibraryView, libraryData};