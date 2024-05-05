/*

IMPORTS

 */

const {
    get_option,
    setup,
    get_default_store
} = require("libmuse");
const {
    shell
} = require("electron");
/*

VARIABLES

 */

let auth = get_option("auth");
let testAuth = null;

async function authentication() {
    return new Promise(async (resolve, reject) => {
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
            resolve(true);
        } else {
            //Check if we have a token in local storage
            const storedAuth = localStorage.getItem("auth");
            if (storedAuth) {
                //We have a token in local storage so lets set it
                const parsedAuth = JSON.parse(storedAuth);
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
                            resolve(false);
                        } else {
                            let headers = await auth.get_headers();
                            auth.client.auth_header = headers.Authorization;
                            //Authentication Complete (Token Refreshed)
                            localStorage.setItem("auth", JSON.stringify(auth));
                            console.log(auth.requires_login());
                            console.log("Logged in w/ refreshed token!", auth._token);
                            resolve(true);
                        }
                    } catch (error) {
                        //Authentication Failed (No Token Refresh)
                        console.error("Login failed:", error);
                        resolve(false);
                    }
                } else {
                    //Authentication Complete (Token in Local Storage)
                    console.log("Logged in w/ stored token!", auth._token);
                    testAuth = auth;
                    console.log("LOOK AT TEST AUTH: ", testAuth);
                    resolve(true);
                }
            } else {
                //Authentication Failed (No Token in Local Storage)
                console.error("Login failed: No Token in Local Storage");
                resolve(false);
            }
        }
    });
}

function getAuth() {
    const storedAuthd = localStorage.getItem("auth");
    return storedAuthd;
}

const auth_flow = async () => {
    try {

        console.log("Getting login code...");
        const loginCode = await auth.get_login_code();

        console.log(
            `Go to ${loginCode.verification_url} and enter the code: ${loginCode.user_code}`,
        );

        let loginCodeUrl = document.getElementById("login-code-url");
        let loginCodeHTML = document.getElementById("login-code");

        // Replace the variable in the content
        loginCodeUrl.innerHTML = loginCodeUrl.innerHTML.replace('$VERIFICATION_URL', "<a href='" + loginCode.verification_url + "'>" + loginCode.verification_url + "</a>");
        loginCodeUrl.addEventListener('click', function(event) {
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
        await auth.load_token_with_code(loginCode.device_code, loginCode.interval);

        // Store the token in localStorage
        localStorage.setItem("auth", JSON.stringify(auth));

        console.log("Logged in!", auth._token);
    } catch (error) {
        console.error("Login failed:", error);
        auth_flow();
    }
};

function codeSubmit() {
    return new Promise((resolve) => {
        let codeSubmitButton = document.getElementById("login");
        codeSubmitButton.onclick = () => {
            resolve();
        }
    });
}

function isTokenExpired(token) {
    if (!token || !token.expires_date) {
        return true;
    }

    // Compare the expiration date with the current date
    let tokenDate = new Date(token.expires_date);
    let currentDate = new Date();
    return tokenDate < currentDate;
}

export {
    authentication,
    auth_flow,
    getAuth,
};
