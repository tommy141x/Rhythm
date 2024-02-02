const cachedir = require('cachedir');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

/*

VARIABLES

 */

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function arrayBufferToString(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

function getImage(url) {
    const cacheDir = cachedir('rhythm');
    if (!fs.existsSync(cacheDir)){
        fs.mkdirSync(cacheDir);
    }
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const cacheFile = path.join(cacheDir, `${hash}.jpg`);
    let outURL = url;
    if (fs.existsSync(cacheFile)) {
        const imageBuffer = fs.readFileSync(cacheFile);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = 'image/jpeg'; // Set this based on the image type
        outURL = `data:${mimeType};base64,${base64Image}`;
        //console.log("Image fetched from cache");
    } else {
        //console.log("Image not in cache, caching image.");
        cacheImg(url, cacheFile);
    }

    return outURL;
}
function cacheImg(imageUrl, cacheFile) {
    https.get(imageUrl, (response) => {
        let data = [];
        // Update the cache file name with the correct extension
        cacheFile = cacheFile.replace('.png', '.jpg');

        response.on('data', (chunk) => {
            data.push(chunk);
        });

        response.on('end', () => {
            fs.writeFileSync(cacheFile, Buffer.concat(data));
            checkCacheSize();
        });
    }).on('error', (err) => {
        console.error(`Error: ${err.message}`);
    });
}

function checkCacheSize() {
    const cacheDir = cachedir('rhythm');
    let totalSize = 0;
    let files = fs.readdirSync(cacheDir);

    files.forEach((file) => {
        totalSize += fs.statSync(path.join(cacheDir, file)).size;
    });

    const MAX_SIZE = 100 * 1024 * 1024; // Maximum size in bytes (100MB)

    if (totalSize > MAX_SIZE) {
        files.sort((a, b) => fs.statSync(path.join(cacheDir, a)).ctime - fs.statSync(path.join(cacheDir, b)).ctime);

        for (let i = 0; i < files.length && totalSize > MAX_SIZE; i++) {
            totalSize -= fs.statSync(path.join(cacheDir, files[i])).size;
            fs.unlinkSync(path.join(cacheDir, files[i]));
        }
    }
}



export {
    getImage,
    shuffleArray,
};
