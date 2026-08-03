const picker = document.getElementById("picker");

picker.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        const json = JSON.parse(r.result);
        render(json);
    };
    r.readAsText(file);
};

function openJSON() {
    const sub = document.getElementById("subreddit").value.trim();
    if (!sub) return;
    window.open(`https://www.reddit.com/r/${sub}.json?limit=100`, "_blank");
}

function mediaURL(id, meta) {
    if (!meta[id]) return "";
    return meta[id].s.u.replace(/&amp;/g, "&");
}

function createImage(src) {
    const img = document.createElement("img")
    img.src = src.replace(/&amp;/g, "&")
    img.loading = 'lazy'
    return img
}

function createImageByMeta(id, meta) {
    return createImage(mediaURL(id, meta))
}

function createVideo(src) {
    const v = document.createElement("video")
    //v.poster = true
    v.preload = 'metadata'
    v.loop = true
    v.controls = true
    v.src = src
    return v
}

function render(json) {
    const feed = document.getElementById("feed");
    feed.innerHTML = "";
    const posts = json.data.children;
    posts.forEach(p => {
        const d = p.data;
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML += `
<div class="flex space-between">
    <a target="_blank" href="https://www.reddit.com/r/${d.subreddit}.json">
        r/${d.subreddit}
    </a>
    <span>${d.name}</span>
</div>
<h3>${d.title || ""}</h3>
${d.selftext ? `<div class="self">${d.selftext}</div>` : ""}
<div>
    <a target="_blank" href="https://www.reddit.com/u/${d.author}.json">
        <span>u/${d.author}</span>
    </a>
</div>
`;

        const g = document.createElement("div");
        g.className = "gallery";
        let has = false;

        debugger

        if (d.gallery_data && d.media_metadata) {
            d.gallery_data.items.forEach(i => {
                // const img = document.createElement("img");
                // img.src = mediaURL(i.media_id, d.media_metadata);
                g.appendChild(createImageByMeta(i.media_id, d.media_metadata));
                has = true;
            });

        }

        else if (d.preview) {
            if (d.preview.reddit_video_preview) {
                g.appendChild(createVideo(d.preview.reddit_video_preview.fallback_url));
                has = true
            }

            else if (d.preview.images.length == 1 
              && d.preview.images[0].source.url.includes('.gif')
              && d.url.includes('.gif')) {
                // const img = document.createElement("img");
                // img.src = d.url.replace(/&amp;/g, "&");
                g.appendChild(createImage(d.url));
                has = true;
            }

            else {
                d.preview.images.forEach(i => {
                    // const img = document.createElement("img");
                    // img.src = i.source.url.replace(/&amp;/g, "&");
                    g.appendChild(createImage(i.source.url))
                    has = true;
                });
            }
        }

        if (d.media && d.media.reddit_video) {
            g.appendChild(createVideo(d.media.reddit_video.fallback_url));
            has = true;
        }

        if (!has && d.link_url && d.link_url.includes('i.redd.it')) {
            // const img = document.createElement("img");
            // img.src = d.link_url.replace(/&amp;/g, "&");
            g.appendChild(createImage(d.link_url));
            has = true;
        }

        if (has) {
            div.appendChild(g);
        }

        feed.appendChild(div);

    });

    const last = posts[posts.length - 1].data;
    const footer = document.createElement("footer");
    footer.innerHTML = `

<h2>Следующая страница</h2>
<p>
    <a target="_blank" href="https://www.reddit.com/r/${last.subreddit}.json?after=${last.name}&limit=100">
        https://www.reddit.com/r/${last.subreddit}.json?after=${last.name}
    </a>
</p>
<p>
    <a target="_blank" href="https://www.reddit.com/u/${last.author}.json?after=${last.name}&limit=100">
        https://www.reddit.com/u/${last.author}.json?after=${last.name}
    </a>
</p>

`;
    feed.appendChild(footer);
}

if ("serviceWorker" in navigator) {
    const sw = `
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>clients.claim());
self.addEventListener("fetch",()=>{});
`;

    navigator.serviceWorker.register(
        URL.createObjectURL(
            new Blob([sw], { type: "text/javascript" })
        )
    );

}