/// <reference types="youtube" />

// How did this code turn into spaghetti so fast
/**
 * @type {undefined | HTMLAudioElement}
 */
let currentMusic;

const ICONS = {
    play: "https://raw.githubusercontent.com/Cube14yt/assets/main/images/play.png",
    pause: "https://raw.githubusercontent.com/Cube14yt/assets/main/images/pause.png",
    reset: "https://raw.githubusercontent.com/Cube14yt/assets/main/images/reset.png",
    volume: "https://raw.githubusercontent.com/Cube14yt/assets/main/images/volume.png"
};

let music_setting;
let play;
let playing = false;
let youtube;
let minimized = false;

function getYouTubeVideoId(input) {
    try {
        const url = new URL(input);

        const host = url.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {
            const id = url.pathname.slice(1);
            if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
        }

        if (host.endsWith("youtube.com")) {

            // watch?v=
            const v = url.searchParams.get("v");
            if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

            // /embed/ID
            const embed = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
            if (embed) return embed[1];

            // /shorts/ID
            const shorts = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
            if (shorts) return shorts[1];
        }

        return null;
    } catch {
        return null;
    }
}

function isValidYouTubeLink(url) {
    return getYouTubeVideoId(url) !== null;
}


function loadYouTubeAPI() {
    return new Promise((resolve) => {
        // Check if it's already loaded
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        // Create a <script> element
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";

        // Insert it into the DOM
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // The API calls this function when it's ready
        // @ts-ignore
        window.onYouTubeIframeAPIReady = () => resolve();
    })
}

/**
 * 
 * @param {string} url 
 */
function makeYoutubeEmbed(url) {
    const videoId = getYouTubeVideoId(url)
    const embedLink = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`
    youtube = document.createElement("iframe")
    youtube.id = "youtubeIframe"
    youtube.src = embedLink
    youtube.allowFullscreen = true
    youtube.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    youtube.referrerPolicy = 'strict-origin-when-cross-origin'
    youtube.classList.add("youtubePlayer")
    const XButton = document.createElement("button")
    XButton.classList.add("XButton")
    XButton.addEventListener("click", function () {
        youtube?.parentNode?.remove()
        youtube = undefined;
    })
    XButton.textContent = "X"
    const minimize = document.createElement("button")
    minimize.classList.add("XButton")
    minimize.style.right = "45px"
    minimize.addEventListener("click", function () {
        if (!minimized) {
            youtube.style.width = "100px"
            youtube.style.height = "50px"
            youtube.parentElement.style.width = "100px"
            youtube.parentElement.style.height = "50px"
            minimize.textContent = "+"
        } else {
            youtube.style.width = "300px"
            youtube.style.height = "200px"
            youtube.parentElement.style.width = "300px"
            youtube.parentElement.style.height = "200px"
            minimize.textContent = "-"
        }
        minimized = !minimized
    })
    minimize.textContent = "-"
    const embedParent = document.createElement("div")
    embedParent.classList.add("embedParent")
    embedParent.appendChild(youtube)
    embedParent.appendChild(minimize)
    embedParent.appendChild(XButton)
    makeDraggable(embedParent)
    return embedParent
}

function setBackgroundMusic(userAudio) {
    let audioSrc;

    if (typeof userAudio === "string") {
        if (!isValidAudioUrl(userAudio)) {
            promptText("Invalid audio URL");
            return;
        }
        audioSrc = new URL(userAudio).href;
    }
    else if (userAudio instanceof File) {
        if (!userAudio.type.startsWith("audio/")) {
            promptText("Invalid audio file");
            return;
        }
        audioSrc = URL.createObjectURL(userAudio);
    }
    else {
        promptText("Invalid audio input");
        return;
    }

    if (currentMusic?.src === audioSrc) return;

    if (currentMusic) {
        currentMusic.pause();
        currentMusic.remove();
    }

    const audio = document.createElement("audio");
    audio.src = audioSrc;
    audio.loop = true;
    audio.volume = 0.5;
    audio.id = "bgm";

    document.body.appendChild(audio);
    currentMusic = audio;

    if (typeof userAudio === "string") {
        settings.bgMusic = audioSrc;
        saveSettings();
    }

    logMessage(`Now playing: ${audioSrc}`);
    return audio;
}


function isValidAudioUrl(url) {
    try {
        const u = new URL(url);
        return ['http:', 'https:'].includes(u.protocol)
            && /\.(mp3|wav|ogg)$/i.test(u.pathname);
    } catch {
        return false;
    }
}

/**
 * Clamp a value between min and max
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 
 * @param {HTMLElement} el 
 */
function makeDraggable(el) {
    let offsetX = 0, offsetY = 0;
    let isDragging = false;

    el.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = el.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        el.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        // ignore this hack
        newLeft = clamp(newLeft, 0, window.innerWidth - el.offsetWidth) + (el.offsetWidth / 2);
        newTop = clamp(newTop, 0, window.innerHeight - el.offsetHeight);

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        el.style.cursor = 'grab';
    });

    el.addEventListener('touchstart', (e) => {
        isDragging = true;
        const touch = e.touches[0];
        const rect = el.getBoundingClientRect();
        offsetX = touch.clientX - rect.left;
        offsetY = touch.clientY - rect.top;
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];

        let newLeft = touch.clientX - offsetX;
        let newTop = touch.clientY - offsetY;

        // ignore this hack
        newLeft = clamp(newLeft, 0, window.innerWidth - el.offsetWidth) + (el.offsetWidth / 2);
        newTop = clamp(newTop, 0, window.innerHeight - el.offsetHeight);

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });
}

dependOn("betterSettings.js", () => {

    // @ts-ignore
    const settings_tab = new SettingsTab("background_music.js");

    // @ts-ignore
    music_setting = new Setting(
        "Background Music",
        "bgm",
        // @ts-ignore
        settingType.TEXT,
        false
    );

    // @ts-ignore
    play = new Setting(
        "Play",
        "play",
        // @ts-ignore
        settingType.BOOLEAN,
        false
    );

    settings_tab.registerSettings(undefined, play);
    settings_tab.registerSettings(undefined, music_setting);

    // @ts-ignore
    settingsManager.registerTab(settings_tab);

}, true);


keybinds["KeyK"] = () => {
    if (playing) {
        document.getElementById("pauseButton")?.click();
    }
};


function createIcon(src) {
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("pixelArt");
    return img;
}


function createButton(id, icon, onClick) {

    const btn = document.createElement("button");

    btn.id = id;
    btn.style.pointerEvents = "auto";
    btn.style.border = "2px solid white";

    if (icon) btn.appendChild(createIcon(icon));

    btn.onclick = onClick;

    return btn;
}



/* ------------------------- */
/* Buttons */
/* ------------------------- */

function createPauseButton() {

    const btn = createButton(
        "pauseButton",
        ICONS.play,
        /**
         * @this {HTMLButtonElement}
         */
        function () {

            this.replaceChildren();
            if (playing) {

                this.appendChild(createIcon(ICONS.play));
                currentMusic?.pause();

            } else {

                this.appendChild(createIcon(ICONS.pause));

                const url = music_setting.value;

                if (!currentMusic) {
                    setBackgroundMusic(url);
                }

                currentMusic?.play();
            }

            playing = !playing;
        }
    );

    return btn;
}



function createResetButton() {

    return createButton(
        "resetButton",
        ICONS.reset,
        () => {
            if (currentMusic) currentMusic.currentTime = 0;
        }
    );

}



function createVolumeButton() {

    return createButton(
        "volumeButton",
        ICONS.volume,
        () => {

            promptInput(
                "Input the new volume of the current music",
                (vol) => {

                    if (!currentMusic) return;

                    const newVolume = Number(vol);

                    if (newVolume >= 0 && newVolume <= 1) {
                        currentMusic.volume = newVolume;
                    }
                }
            );
        }
    );

}



function createInputButton() {

    const btn = createButton("inputButton", null, () => {

        promptChoose(
            "How do you want to input your song?",
            ["URL", "File"],
            (choice) => {

                if (choice === "URL") {

                    promptInput(
                        "Give the url your song should use",
                        (url) => {
                            if (isValidYouTubeLink(url)) {
                                document.body.appendChild(makeYoutubeEmbed(url))
                                return;
                            }
                            youtube.parentNode.remove()
                            youtube = undefined;
                            music_setting.value = url;
                        },
                        "Input URL"
                    );

                }

                if (choice === "File") {

                    const input = document.createElement("input");

                    input.type = "file";

                    input.addEventListener("change", (event) => {

                        // @ts-ignore
                        const file = event.target.files?.[0];

                        if (file) {
                            setBackgroundMusic(file);
                        }

                    });

                    input.click();
                }

            }
        );

    });

    btn.textContent = "Input Song";

    return btn;
}



/* ------------------------- */
/* UI Creation */
/* ------------------------- */

function showSongUi() {

    let songDiv = document.getElementById("songUiParent");

    const canvas_div = document.getElementById("canvasDiv");

    if (!canvas_div) {
        requestAnimationFrame(showSongUi);
        return;
    }

    if (!songDiv) {

        songDiv = document.createElement("div");

        songDiv.id = "songUiParent";
        songDiv.classList.add("songControl");

        songDiv.append(
            createPauseButton(),
            createResetButton(),
            createVolumeButton(),
            createInputButton()
        );

        canvas_div.appendChild(songDiv);
    }

    console.log("UI loaded successfully");
}



/* ------------------------- */
/* CSS */
/* ------------------------- */

function addCss() {

    const CSS = `
.songControl {
    position:absolute;
    bottom:0;
    left:50%;
    transform:translateX(-50%);
    display:flex;
    gap:10px;
    align-items:center;
    justify-content:center;
    padding:10px;
    height:20px;
    pointer-events:none;
    background:transparent;
    border:2px solid white;
    box-shadow:0 0 8px rgba(0,0,0,0.8);
}

.youtubeEmbed {
    width:100%;
}

.embedParent {
    position:absolute;
    bottom:40px;
    left:50%;
    transform:translateX(-50%);
    pointer-events: auto;
    touch-action: none;
    padding-top: 45px;
    border:2px solid white;
    height: 200px;
    width: 300px;
    background-color: grey;
}

.pixelArt{
    image-rendering:pixelated;
    image-rendering:crisp-edges;
    width:15px;
    height:auto;
}
`;

    const style = document.createElement("style");
    style.innerHTML = CSS;

    document.head.appendChild(style);
}

// Init
addCss();
showSongUi();
