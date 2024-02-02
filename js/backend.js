/*

IMPORTS

 */

import {clearQueue, showDetails} from "./queue.js";
import {loadHomeView} from "./home.js";
import {libraryData, loadLibraryView} from "./library.js";
import {loadExploreView} from "./explore.js";
import {showPlaylist} from "./playlist.js";
import {player, playSong} from "./player.js";
import {getImage} from "./utils.js";

const fastdom = require('fastdom');
//gotta get rid of the rest of these imports since we using web workers now ^

const {
    shell,
    ipcRenderer,
} = require('electron');

/*

VARIABLES

 */

let user = null;
let loadQueue = {
    auth: false,
    home: false,
    library: false,
    explore: false,
    tracks: false,
};


// Get the home button element from the document
const homeButton = document.getElementById('home-button');

// Add an event listener to the home button that shows the home view when clicked
homeButton.addEventListener('click', function () {
    showView('homeView');
});

// Get the library button element from the document
const libraryButton = document.getElementById('library-button');

// Add an event listener to the library button that shows the library view when clicked
libraryButton.addEventListener('click', function () {
    showView('libraryView');
});

// Get the explore button element from the document
const exploreButton = document.getElementById('explore-button');

// Add an event listener to the explore button that shows the explore view when clicked
exploreButton.addEventListener('click', function () {
    showView('exploreView');
});

// Get the queue button element from the document
const queueButton = document.getElementById('queue-button');

// Add an event listener to the queue button that shows the queue details when clicked
queueButton.addEventListener('click', function () {
    showDetails();
});

const worker = new Worker('js/worker.js', {type: 'module'});
worker.postMessage({func: "authentication", args: undefined});
worker.onmessage = async (event) => {
    if (event.data.error) {
        console.error(event.data.error);
    }
    let success = event.data;
    if (success) {
        loadQueue.auth = true;
        loadMainView();
    } else {
        loadLoginView();
    }
}

function addToPlaylist(videoId, playlistId) {
    if (playlistId) {
        const worker = new Worker('js/worker.js', {type: 'module'});
        worker.postMessage({func: "add_playlist_items", args: {playlistId: playlistId, videoId: videoId}});
        worker.onmessage = async (event) => {
            if (event.data.error) {
                console.error(event.data.error);
            }
            let res = event.data;
            if (res.status == "STATUS_SUCCEEDED") {
                showNotification("Added to playlist");
                //refreshPlaylist playlistId
            } else {
                showNotification("Failed to add to playlist");
            }
        }
    } else {
        const modal = document.getElementById("modal");
        modal.innerHTML = '';
        const header = document.createElement('div');
        header.classList.add('playlist-header');
        libraryData.results.forEach(item => {
            if (item.type == "playlist") {
                const image = document.createElement('img');
                image.src = getImage(item.thumbnails[item.thumbnails.length - 1].url);
                image.alt = item.title;
                image.classList.add('playlist-art');
                image.addEventListener('click', function () {
                    closeModal();
                    addToPlaylist(videoId, item.playlistId);
                });
                header.appendChild(image);
            }
        });
        modal.appendChild(header);
        showModal();
    }
}

function removeFromPlaylist(videoId, playlistId) {
    const worker = new Worker('js/worker.js', {type: 'module'});
    worker.postMessage({func: "remove_playlist_items", args: {playlistId: playlistId, videoId: videoId}});
    worker.onmessage = async (event) => {
        if (event.data.error) {
            console.error(event.data.error);
        }
        let res = event.data;
        if (res.status == "STATUS_SUCCEEDED") {
            showNotification("Removed from playlist");
            //refreshPlaylist playlistId
            showPlaylist(playlistId);
        } else {
            showNotification("Failed to remove from playlist");
        }
    }
}

function openSettings() {
    const modal = document.getElementById("modal");
    showModal();
}

function openPlaylistDetails(playlistId) {
    const modal = document.getElementById("modal");
    showModal();
}

function showModal() {
    document.getElementById("modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

function showNotification(text) {
    let notification = document.getElementById("notification");
    notification.innerText = text;
    notification.style.display = "block";
    setTimeout(function () {
        notification.style.display = "none";
    }, 3000); // hide after 3 seconds
}


async function loadMainView() {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("mainView").style.display = "flex";
    const avatar = document.getElementById('avatar');
    setContextMenu(avatar, [{
        title: "Logout",
        icon: "logout",
        onClick: () => {
            localStorage.removeItem("auth");
            loadLoginView();
        }
    }]);
    await loadHomeView();
    await loadLibraryView();
    await loadExploreView();
}

function loadLoginView() {
    //auth_flow();
    const worker = new Worker('js/worker.js', {type: 'module'});
    worker.postMessage({func: "get_login_code", args: undefined});
    worker.onmessage = async (event) => {
        if (event.data.error) {
            console.error(event.data.error);
        }
        let loginCode = event.data;
        let loginCodeUrl = document.getElementById("login-code-url");
        let loginCodeHTML = document.getElementById("login-code");

        document.getElementById("loginView").style.display = "flex";
        document.getElementById("mainView").style.display = "none";

        Object.keys(loadQueue).forEach((key) => {
            loadQueue[key] = true;
        });
        // Replace the variable in the content
        loginCodeUrl.innerHTML = loginCodeUrl.innerHTML.replace('$VERIFICATION_URL', "<a href='" + loginCode.verification_url + "'>" + loginCode.verification_url + "</a>");
        loginCodeUrl.addEventListener('click', function (event) {
            event.preventDefault();
            shell.openExternal(loginCode.verification_url);
        });
        loginCode.HTML = loginCodeHTML.innerHTML = loginCode.user_code;

        // Set a timeout for 1 minute
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => {

                reject(new Error("Authentication timeout"));
            }, 60000)
        );

        // Wait for the code to be submitted or timeout
        await Promise.race([timeoutPromise, codeSubmit()]);

        console.log("Loading token...");

        const worker = new Worker('js/worker.js', {type: 'module'});
        worker.postMessage({
            func: "login_with_code",
            args: {device_code: loginCode.device_code, interval: loginCode.interval}
        });
        worker.onmessage = async (event) => {
            if (event.data) {

                Object.keys(loadQueue).forEach((key) => {
                    loadQueue[key] = false;
                });
                loadQueue.auth = true;
                loadMainView();
            }
        }
    }
}

function codeSubmit() {
    return new Promise((resolve) => {
        let codeSubmitButton = document.getElementById("login");
        codeSubmitButton.onclick = () => {
            resolve();
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    let searchInput = document.getElementById('searchInput');
    let suggestionContainer = document.getElementById('suggestionContainer');
    let searchBar = document.getElementById('searchBar');

    searchInput.addEventListener('input', function () {
        handleInputChange();
    });

    searchInput.addEventListener('blur', function() {
        clearSuggestions();
    });

    searchBar.addEventListener('submit', function (event) {
        event.preventDefault();
        handleSubmit();
    });

    function handleInputChange() {
        let inputValue = searchInput.value.trim();

        if (inputValue !== '') {
            const worker = new Worker('js/worker.js', {type: 'module'});
            worker.postMessage({func: "search_suggestions", args: inputValue});
            worker.onmessage = async (event) => {
                if (event.data.error) {
                    console.error(event.data.error);
                }
                let result = event.data;
                displaySuggestions(result.suggestions);
            }
        } else {
            clearSuggestions();
        }
    }

    function handleSubmit() {
        clearSuggestions();
        searchInput.blur();
        const worker = new Worker('js/worker.js', {type: 'module'});
        worker.postMessage({func: "search", args: searchInput.value});
        worker.onmessage = async (event) => {
            if (event.data.error) {
                console.error(event.data.error);
            }
            let result = event.data;
            console.log(result);
            const resultsView = document.getElementById('resultsView');
            resultsView.innerHTML = '';
            const resultsContainer = document.createElement('div');
            resultsContainer.classList.add('results-container');
            let songsCategory = result.categories.find(function (category) {
                return category.filter === "songs";
            });
            let appendedSongs = {};
            appendSong(result.top_result);

            function appendSong(song) {
                if (song.type && song.type !== "song") return;
                if (appendedSongs[song.title] === song.artists[0].id) return;
                appendedSongs[song.title] = song.artists[0].id;
                const songContainer = document.createElement('div');
                songContainer.classList.add('result-container');
                const leftCon = document.createElement('div');
                leftCon.classList.add('left-info-container');
                const infoContainer = document.createElement('div');
                infoContainer.classList.add('info-container');
                songContainer.onclick = () => {
                    clearQueue(true);
                    playSong(song.videoId);
                }
                const songArt = document.createElement('img');
                songArt.src = getImage(song.thumbnails[song.thumbnails.length - 1].url);
                songArt.alt = song.title;
                songArt.classList.add('track-art');
                leftCon.appendChild(songArt);
                const songTitle = document.createElement('h2');
                songTitle.textContent = song.title;
                infoContainer.appendChild(songTitle);
                const songArtist = document.createElement('p');
                song.artists.forEach((artist) => {
                    songArtist.textContent += artist.name;
                    if (song.artists.indexOf(artist) != song.artists.length - 1) {
                        songArtist.textContent += ', ';
                    }
                });
                infoContainer.appendChild(songArtist);
                leftCon.appendChild(infoContainer);
                songContainer.appendChild(leftCon);
                //const songAlbum = document.createElement('p');
                //songAlbum.textContent = song.album.name;
                //songContainer.appendChild(songAlbum);
                const songDuration = document.createElement('p');
                songDuration.textContent = song.duration;
                songContainer.appendChild(songDuration);
                resultsContainer.appendChild(songContainer);
                resultsView.appendChild(resultsContainer);
            }
            songsCategory.results.forEach((song) => {
                appendSong(song);
            });
            result.top_result.more.forEach((song) => {
                appendSong(song);
            });
            showView('resultsView');
            console.log(appendedSongs);
        }
    }

    function displaySuggestions(suggestions) {
        clearSuggestions();

        suggestions.forEach((suggestion) => {
            let innerHTML = '<p>';
            suggestion.search.forEach((bit) => {
                if (bit.bold) {
                    innerHTML = innerHTML + "<b>" + bit.text + "</b>";
                }else {
                    innerHTML = innerHTML + bit.text;
                }
            });
            innerHTML = innerHTML + '</p>';
            let suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestionItem');
            suggestionItem.innerHTML = innerHTML;
            suggestionItem.addEventListener('click', function () {
                searchInput.value = suggestion.query;
                clearSuggestions();
                handleSubmit();
            });
            suggestionContainer.appendChild(suggestionItem);
        });
        const searchBar = document.getElementById('searchBar');
        const rect = searchBar.getBoundingClientRect();
        const topPosition = rect.bottom; // Position it below the specific div
        const leftPosition = rect.left + window.scrollX;
        const specificDivWidth = window.getComputedStyle(searchBar).width;
        suggestionContainer.style.top = topPosition + 'px';
        suggestionContainer.style.left = leftPosition + 'px';
        suggestionContainer.style.width = specificDivWidth;
        suggestionContainer.style.visibility = 'visible';
    }

    function clearSuggestions() {
        suggestionContainer.innerHTML = '';
        suggestionContainer.style.visibility = 'hidden';
    }
});

// FUNCTIONS
document.addEventListener('click', (event) => {
    const modal = document.getElementById("modal");
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
    }
    if (!modal.contains(event.target) && !contextMenu.contains(event.target)) {
        modal.style.display = 'none';
    }
});

function setContextMenu(element, menu) {
    if (element) {
        const contextMenu = document.getElementById('contextMenu');
        element.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            fastdom.mutate(() => {
                contextMenu.style.display = 'block';
                contextMenu.style.left = event.pageX + 'px';
                contextMenu.style.top = event.pageY + 'px';
                contextMenu.innerHTML = '';
            });
            menu.forEach((item) => {
                fastdom.mutate(() => {
                    // Create a new list item for each menu item
                    const menuItem = document.createElement('li');

                    // Create a Material Icon and set its class name to the icon name
                    const icon = document.createElement('i');
                    icon.className = `material-icons`;
                    icon.innerText = item.icon;
                    // Create a span for the title and set its text content to the title
                    const title = document.createElement('span');
                    title.innerText = item.title;

                    // Append the icon and title to the menu item
                    menuItem.appendChild(icon);
                    menuItem.appendChild(title);

                    // Add the click event listener to the menu item
                    menuItem.addEventListener('click', () => {
                        // Hide the context menu
                        contextMenu.style.display = 'none';

                        // Call the callback function
                        item.onClick();
                    });

                    // Append the menu item to the context menu
                    contextMenu.appendChild(menuItem);
                });
            });
        });
    }
}

let lastView = "homeView";
let detailViewShown = false;

function showView(viewId) {
    // Hide all views
    let views = document.querySelectorAll('#detailView, #homeView, #exploreView, #libraryView, #resultsView, #playlistView, #artistView');
    views.forEach(function (view) {
        fastdom.mutate(() => {
            view.style.display = 'none';
        });
    });

    if (detailViewShown && viewId === "detailView") {
        fastdom.mutate(() => {
            document.getElementById("detailView").style.display = "none";
        });
        detailViewShown = false;
        viewId = lastView;
    } else if (detailViewShown) {
        detailViewShown = false;
    } else if (viewId === "detailView") {
        detailViewShown = true;
    } else {
        lastView = viewId;
    }

    // Show the selected view
    let selectedView = document.getElementById(viewId);
    if (selectedView) {
        fastdom.mutate(() => {
            selectedView.style.display = 'flex';
        });
    }
}


window.onload = function () {
    setTimeout(() => {
        //updateVolumeBar();
        const bottomPlayer = document.getElementById('bottomPlayerView');
        if (bottomPlayer.classList.contains('active')) {
            fastdom.mutate(() => {
                const contentView = document.getElementById('contentView');
                const sidebarView = document.getElementById('sidebarView');
                bottomPlayer.style.transition = "opacity 1s ease-in-out, height 1s ease-in-out";
                contentView.style.transition = "height 1s ease-in-out";
                sidebarView.style.transition = "height 1s ease-in-out";
                bottomPlayer.classList.remove('active');
                setTimeout(() => {
                    bottomPlayer.style.transition = "";
                    contentView.style.transition = "";
                    sidebarView.style.transition = "";
                }, 1000)
                contentView.style.height = '90vh';
                sidebarView.style.height = '90vh';
            });
        }
        loadQueue.tracks = true;
    }, 500);


    const timer = setInterval(() => {
        let loaded = true;
        Object.keys(loadQueue).forEach((key) => {
            if (!loadQueue[key]) {
                loaded = false;
                //console.log("Not loading because " + key + " is not loaded.");
            }
        });
        if (loaded) {
            clearInterval(timer);
            fastdom.mutate(() => {
                document.getElementById("preload").style.display = 'none';
            });
        }
    }, 500);
};

/*

    UPDATE DISCORD RICH PRESENCE VIA IPC TO APP.JS

 */
function updatePresence() {
    let startTime = Date.now() - player.active.seek() * 1000;
    let endTime = startTime + player.active.duration() * 1000;
    const activity = {
        details: player.videoDetails.title,
        state: player.videoDetails.author,
        thumbnailURL: player.videoDetails.thumbnail.thumbnails[player.videoDetails.thumbnail.thumbnails.length - 1].url,
        start: startTime,
        end: endTime,
        songUrl: "https://music.youtube.com/watch?v=" + player.videoDetails.videoId,
    };

    ipcRenderer.send('updatePresence', JSON.stringify(activity));
}


let afkTimer = null;
setInterval(() => {
    if (player.active && (!player.active.state() || !player.active.playing())) {
        // If audio is not playing, start the timer
        if (afkTimer == null) {
            afkTimer = setTimeout(function () {
                const bottomPlayer = document.getElementById('bottomPlayerView');
                if (bottomPlayer.classList.contains('active')) {
                    fastdom.mutate(() => {
                        const contentView = document.getElementById('contentView');
                        const sidebarView = document.getElementById('sidebarView');
                        bottomPlayer.style.transition = "opacity 1s ease-in-out, height 1s ease-in-out";
                        contentView.style.transition = "height 1s ease-in-out";
                        sidebarView.style.transition = "height 1s ease-in-out";
                        bottomPlayer.classList.remove('active');
                        setTimeout(() => {
                            bottomPlayer.style.transition = "";
                            contentView.style.transition = "";
                            sidebarView.style.transition = "";
                        }, 1000)
                        contentView.style.height = '90vh';
                        sidebarView.style.height = '90vh';
                    });
                }
            }, 15 * 60000); // 15 Minutes
        }
        ipcRenderer.send('updatePresence', 'clear');
    } else {
        // If audio is playing, clear the timer
        if (afkTimer != null) {
            clearTimeout(afkTimer);
            afkTimer = null;
        }
        if (player.active && player.videoDetails) {
            updatePresence();
        }
    }
}, 3e3); // Check every 3 seconds


// Function to trigger the requires-login event when the button is clicked
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;


window.console.warn = function (...args) {
    ipcRenderer.send('console-warn', args);
    originalConsoleWarn(...args);
};

// This line of code is redefining the console.error function in JavaScript
window.console.error = function (...args) {
    ipcRenderer.send('console-error', args);
    originalConsoleError(...args);
};

window.refreshcss = false;

function refreshStyles() {
    if (window.refreshcss) {
        let style = document.getElementById("styles");
        style.remove();
        style = document.createElement("link");
        style.id = "styles";
        style.href = "./css/styles.css"
        style.rel = "stylesheet";
        document.head.appendChild(style);
    }
}

setInterval(refreshStyles, 5000);

export {
    showView,
    addToPlaylist,
    removeFromPlaylist,
    setContextMenu,
    loadQueue,
    updatePresence,
    loadMainView
};