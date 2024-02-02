//JS
// Worker thread
const {
    get_song,
    get_artist,
    get_home,
    get_playlist,
    get_album,
    get_library,
    get_explore,
    set_option, setup, get_default_store, get_option, add_playlist_items, remove_playlist_items, get_search_suggestions,
    search
} = require("libmuse");
const keytar = require('keytar');
let auth = get_option("auth");
set_option("proxy", "https://www.tommy-johnston.com/proxy");
let ev;
let timeout = 1;
function handleErrors(promise) {
    return promise.catch((e) => {
        if (timeout < 5) {
        timeout++;
        setTimeout(() => {
            self.onmessage(ev);
        }, 500);
        }else{
            console.error("WORKER REQUEST FAILED", "Function Name:", ev.data.func, "Arguments:", ev.data.args, "Error:", e);
            if ('cause' in e) {
                console.error('Caused by', e.cause);
            }
            self.postMessage({error: e.toString()});
        }
    });
}

self.onmessage = async (event) => {
    ev = event;
    let func = event.data.func;
    let args = event.data.args;
    try {
        keytar.getPassword("Muse", "auth").then(async (storedAuth) => {
            await setup({
                store: get_default_store(),
                auth: auth,
                debug: true
            });
            let parsedAuth = JSON.parse(storedAuth);
            parsedAuth.token = parsedAuth._token;
            auth._token = parsedAuth._token;
            auth.token = parsedAuth.token;
            auth.client.auth_header = parsedAuth.client.auth_header;
            //console.log("Running function: " + func + "(" + args + "); | Attempt #" + timeout);
            if (func === "get_song") {
                handleErrors(get_song(args).then((song) => {
                    self.postMessage(song);
                }));
            } else if (func === "get_album") {
                handleErrors(get_album(args).then((album) => {
                    self.postMessage(album);
                }));
            } else if (func === "get_playlist") {
                handleErrors(get_playlist(args).then((playlist) => {
                    self.postMessage(playlist);
                }));
            } else if (func === "get_home") {
                handleErrors(get_home().then((home) => {
                    self.postMessage(home);
                }));
            } else if (func === "get_artist") {
                handleErrors(get_artist(args).then((artist) => {
                    self.postMessage(artist);
                }));
            } else if (func === "get_library") {
                handleErrors(get_library(args).then((library) => {
                    self.postMessage(library);
                }));
            } else if (func === "get_explore") {
                handleErrors(get_explore(args).then((explore) => {
                    self.postMessage(explore);
                }));
            } else if (func === "search") {
                handleErrors(search(args).then((search) => {
                    self.postMessage(search);
                }));
            } else if (func === "search_suggestions") {
                handleErrors(get_search_suggestions(args).then((suggestions) => {
                    self.postMessage(suggestions);
                }));
            } else if (func === "add_playlist_items") {
                handleErrors(add_playlist_items(args.playlistId, [args.videoId]).then((res) => {
                   self.postMessage(res);
                }));
            } else if (func === "remove_playlist_items") {
                handleErrors(remove_playlist_items(args.playlistId, [{videoId: args.videoId}]).then((res) => {
                    self.postMessage(res);
                }));
            } else if (func === "authentication") {
                await setup({
                    store: get_default_store(),
                    auth: auth,
                    debug: true
                });
                //Check if we already have a good token
                if (auth.has_token() && !isTokenExpired(auth._token)) {
                    //Token is good so login with valid authentication
                    auth.get_headers().then((headers) => {
                        auth.client.auth_header = headers.Authorization;
                    });
                    //Authentication Complete
                    console.log("Logged in!", auth._token);
                    self.postMessage(true);
                } else {
                    //Check if we have a token in local storage
                    //const storedAuth = localStorage.getItem("auth");
                    //We have a token in local storage so lets set it
                    keytar.getPassword("Muse", "auth").then(async (storedAuth) => {
                        if (storedAuth != null) {
                            const parsedAuth = JSON.parse(storedAuth);
                            //parsedAuth._token = "ya29.a0AfB_byDvBuYTfff7-NCl41PDjUhb3OG4s_fqSsXuqP1…aRaCgYKAQ0SARISFQHGX2MiLiJMb0CacorA3L4Qb7s8sw0183";
                            parsedAuth.token = parsedAuth._token;
                            auth._token = parsedAuth._token;
                            auth.token = parsedAuth.token;
                            auth.client.auth_header = parsedAuth.client.auth_header;
                            //Check if the token is expired
                            if (isTokenExpired(parsedAuth._token)) {
                                //Token is expired so lets try to refresh it
                                try {
                                    //We got new credentials so lets set it
                                    console.log(auth);
                                    console.log("Attempting to refresh token");
                                    await auth.get_token();
                                    if (auth._token === parsedAuth._token && isTokenExpired(auth._token)) {
                                        //Authentication Failed (Token Refresh Failed)
                                        //console.log(auth._token, parsedAuth._token);
                                        console.log(auth);
                                        self.postMessage(true);
                                    } else {
                                        let headers = await auth.get_headers();
                                        auth.client.auth_header = headers.Authorization;
                                        //Authentication Complete (Token Refreshed)
                                        //localStorage.setItem("auth", JSON.stringify(auth));
                                        keytar.setPassword("Muse", "auth", JSON.stringify(auth)).catch((e) => {
                                            console.error(e);
                                        });
                                        console.log(auth.requires_login());
                                        console.log("Logged in w/ refreshed token!", auth._token);
                                        self.postMessage(true);
                                    }
                                } catch (error) {
                                    //Authentication Failed (No Token Refresh)
                                    console.error("Login failed:", error);
                                    self.postMessage(false);
                                }
                            } else {
                                //Authentication Complete (Token in Local Storage)
                                console.log("Logged in w/ stored token!", auth._token);
                                self.postMessage(true);
                            }
                        } else {
                            //Authentication Failed (No Token in Local Storage)
                            console.error("Login failed: No Token in Local Storage");
                            self.postMessage(false);
                        }
                    }).catch((e) => {
                        console.error(e);
                        self.postMessage({error: e.toString()});
                    });
                }
            } else if (func === "get_login_code") {
                const loginCode = await auth.get_login_code();
                self.postMessage(loginCode);
            } else if (func === "login_with_code") {
                await auth.load_token_with_code(args.device_code, args.interval);
                keytar.setPassword("Muse", "auth", JSON.stringify(auth)).catch((e) => {
                    console.error(e);
                    self.postMessage({error: e.toString()});
                });
                self.postMessage(true);
            }
        });
    } catch (e) {
        setTimeout(() => {
            self.onmessage(event);
        }, 500);
    }
};

function isTokenExpired(token) {
    if (!token || !token.expires_date) {
        return true;
    }

    // Compare the expiration date with the current date
    let tokenDate = new Date(token.expires_date);
    let currentDate = new Date();
    return tokenDate < currentDate;
}
