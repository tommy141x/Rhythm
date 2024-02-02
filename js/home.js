/*

IMPORTS

 */
import {addToPlaylist, loadQueue, setContextMenu} from "./backend.js";
import {showArtist} from "./artist.js";
import {showAlbum, showPlaylist} from "./playlist.js";
import {playSong} from "./player.js";
import {addToQueueNext, clearQueue} from "./queue.js";
import {getImage} from "./utils.js";

/*

VARIABLES

 */

let homeData = null;

async function loadHomeView() {
    const worker = new Worker('js/worker.js', {type: 'module'});
    worker.postMessage({func: "get_home", args: undefined});
    worker.onmessage = async (event) => {
        if (event.data.error) {
            console.error(event.data.error);
            setTimeout(loadHomeView, 1000);
            return;
        }
        homeData = event.data;
        document.getElementById("homeView").style.display = "flex";
        // Get the contentView div
        const homeView = document.getElementById('homeView');

        // Iterate through each result in the homeData
        homeData.results.forEach(result => {
            // Create a container div for each item
            const section = document.createElement('div');
            section.classList.add('section');
            const sectionHead = document.createElement('div');
            sectionHead.classList.add('section-head');
            const itemContainer = document.createElement('div');
            itemContainer.classList.add('item-container');

            // Check if there is at least one thumbnail
            if (result.thumbnails && result.thumbnails.length > 0) {
                // Create an image element for the thumbnail
                const backgroundImg = document.createElement('div');
                const thumbnailImg = document.createElement('img');
                thumbnailImg.src = getImage(result.thumbnails[result.thumbnails.length - 1].url);
                thumbnailImg.classList.add('avatar');
                thumbnailImg.alt = result.title;

                // Append the thumbnail to the container
                backgroundImg.style.background = "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(50,50,50,1)), url(" + thumbnailImg.src + ")";
                backgroundImg.style.backgroundSize = "cover";
                backgroundImg.classList.add('bg');
                section.appendChild(backgroundImg);
                section.appendChild(thumbnailImg);
            }

            // Create a heading element for the title
            const titleHeading = document.createElement('h2');
            titleHeading.textContent = result.title;

            // Create a paragraph element for the subtitle
            const subtitlePara = document.createElement('p');
            subtitlePara.textContent = result.subtitle;

            // Append the title and subtitle to the container
            sectionHead.appendChild(titleHeading);
            sectionHead.appendChild(subtitlePara);
            section.appendChild(sectionHead);
            result.contents.forEach(item => {
                // Create a container div for each item
                if (item == null) return;
                const subItemContainer = document.createElement('div');
                subItemContainer.classList.add('sub-item-container');
                if (item.type == "artist") {
                    setContextMenu(subItemContainer, [{
                        title: "Follow",
                        icon: "add",
                        onClick: () => {
                            addToPlaylist(item.videoId);
                        }
                    }, {
                        title: "Play Artist Radio",
                        icon: "add",
                        onClick: () => {
                            alert("Added to playlist");
                            //add to library
                        }
                    }, {
                        title: "Share",
                        icon: "share",
                        onClick: () => {
                            alert("Added to playlist");
                            //copy link and add notification
                        }
                    }]);
                } else if (item.type == "album") {
                    setContextMenu(subItemContainer, [{
                        title: "Add to Library",
                        icon: "add",
                        onClick: () => {
                            alert("Added to playlist");
                            //add to library
                        }
                    }, {
                        title: "Share",
                        icon: "share",
                        onClick: () => {
                            alert("Added to playlist");
                            //copy link and add notification
                        }
                    }]);
                } else if (item.type == "playlist") {
                    setContextMenu(subItemContainer, [{
                        title: "Edit details",
                        icon: "add",
                        onClick: () => {
                            alert("Added to playlist");
                            //add to library
                        }
                    }, {
                        title: "Delete",
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
                } else if (item.type == "song" || item.type == "inline-video") {
                    setContextMenu(subItemContainer, [{
                        title: "Play Next",
                        icon: "add",
                        onClick: () => {
                            addToQueueNext(item, true);
                        }

                    },{
                        title: "Add to Playlist",
                        icon: "add",
                        onClick: () => {
                            addToPlaylist(item.videoId);
                        }
                    }, {
                        title: "Add to Library",
                        icon: "add",
                        onClick: () => {
                            alert("Added to playlist");
                            //add to library
                        }
                    }, {
                        title: "Share",
                        icon: "share",
                        onClick: () => {
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

                subItemContainer.addEventListener('click', function() {
                    if (item.type == "playlist") {
                        showPlaylist(item.playlistId)
                    } else if (item.type == "song" || item.type == "inline-video") {
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
                } else if (item) {
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
                itemContainer.appendChild(subItemContainer);
            });

            // Append the container to the contentView
            homeView.appendChild(section);
            homeView.appendChild(itemContainer);
        });
        loadQueue.home = true;
    }
}

export {
    loadHomeView,
    homeData
};
