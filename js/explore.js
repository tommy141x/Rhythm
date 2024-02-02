/*

IMPORTS

 */
import {addToPlaylist, loadQueue, setContextMenu} from "./backend.js";
import {clearQueue} from "./queue.js";
import {playSong} from "./player.js";
import {showAlbum, showPlaylist} from "./playlist.js";
import {showArtist} from "./artist.js";
import {getImage} from "./utils.js";

/*

VARIABLES

 */
let exploreData = null;

async function loadExploreView() {
    const worker = new Worker('js/worker.js', {type: 'module'});
    worker.postMessage({func: "get_explore", args: undefined});
    worker.onmessage = async (event) => {
        if (event.data.error) {
            console.error(event.data.error);
            setTimeout(loadExploreView, 1000);
            return;
        }
        exploreData = event.data;
        const exploreView = document.getElementById('exploreView');
        exploreView.innerHTML = '';
        Object.keys(exploreData).forEach(catName => {
            let cat = exploreData[catName];
            const section = document.createElement('div');
            section.classList.add('section');
            const sectionHead = document.createElement('div');
            sectionHead.classList.add('section-head');
            const itemContainer = document.createElement('div');
            itemContainer.classList.add('item-container');

            // Check if there is at least one thumbnail
            if (cat.thumbnails && cat.thumbnails.length > 0) {
                // Create an image element for the thumbnail
                const thumbnailImg = document.createElement('img');
                thumbnailImg.src = getImage(result.thumbnails[result.thumbnails.length - 1].url);
                thumbnailImg.alt = result.title;

                // Append the thumbnail to the container
                section.appendChild(thumbnailImg);
            }

            // Create a heading element for the title
            const titleHeading = document.createElement('h2');
            titleHeading.textContent = "section";

            // Append the title and subtitle to the container
            sectionHead.appendChild(titleHeading);
            section.appendChild(sectionHead);
            cat.results.forEach(item => {
                // Create a container div for each item
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
                } else if (item.type == "song") {
                    setContextMenu(subItemContainer, [{
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
                itemContainer.appendChild(subItemContainer);
            });
            exploreView.appendChild(section);
            exploreView.appendChild(itemContainer);
        });
        loadQueue.explore = true;
    }
}

export {
    loadExploreView
};