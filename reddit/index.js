const TYPES = {
    ALL: 'type_all',
    NOMEDIA: 'type_nomedia',
    IMAGE: 'type_image',
    GIF: 'type_gif',
    VIDEO: 'type_video'
}

const subreddit = document.getElementById('subreddit')
subreddit.addEventListener('input', (e) => {
    createLink(e.target.value)
})

function createLink(sub) {
    const link = document.getElementById('subreddit-download')
    if (!sub?.length) {
        link.href = '#'
        link.innerText = 'Скачать subreddit'
        return
    }
    link.href = `https://www.reddit.com/r/${sub}.json?limit=100`
    link.innerText = `Скачать ${sub}`
}

const picker = document.getElementById("picker");

picker.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        const json = JSON.parse(r.result);
        render(json);
        window.scrollTo({top: 0, left: 0, behavior: 'smooth'})
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
    v.preload = 'metadata'
    v.loop = true
    v.controls = true
    v.src = src
    return v
}

function createCount(length) {
    if (!length || length < 2) return ''
    return `<span>${length} media</span>`
}

function htmlDecode(input) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

function getSelfText(data) {
    if (data.selftext_html) {
        return `<div class="self"><span>${htmlDecode(data.selftext_html)}</span></div>`
    }
    else if (data.selftext) {
        return `<div class="self"><span>${data.selftext}</span></div>`
    }
    else {
        return ''
    }
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
    <span>${new Date(d.created * 1e3).toLocaleString()}</span>
</div>
<h3>${d.title || d.link_title || ""}</h3>
${getSelfText(d)}
<div class="flex space-between">
    <a target="_blank" href="https://www.reddit.com/u/${d.author}.json">
        <span>u/${d.author}</span>
    </a>
    ${createCount(d.gallery_data?.items?.length)}
    <span>${d.name}</span>
</div>
`;

        const g = document.createElement("div");
        g.className = "gallery";
        let has = false;
        let type = TYPES.NOMEDIA

        if (d.gallery_data && d.media_metadata) {
            d.gallery_data.items.forEach(i => {
                // const img = document.createElement("img");
                // img.src = mediaURL(i.media_id, d.media_metadata);
                g.appendChild(createImageByMeta(i.media_id, d.media_metadata));
                has = true;
                type = TYPES.IMAGE
            });

        }

        else if (d.preview) {
            if (d.preview.reddit_video_preview) {
                g.appendChild(createVideo(d.preview.reddit_video_preview.fallback_url));
                has = true
                type = TYPES.IMAGE
            }

            else if (d.preview.images.length == 1
                && d.preview.images[0].source.url.includes('.gif')
                && d.url.includes('.gif')) {
                g.appendChild(createImage(d.url));
                has = true;
                type = TYPES.GIF
            }

            else {
                d.preview.images.forEach(i => {
                    g.appendChild(createImage(i.source.url))
                    has = true;
                    type = TYPES.IMAGE
                });
            }
        }

        if (d.media && d.media.reddit_video) {
            g.appendChild(createVideo(d.media.reddit_video.fallback_url));
            has = true;
            type = TYPES.VIDEO
        }

        if (!has && d.link_url && d.link_url.includes('i.redd.it')) {
            g.appendChild(createImage(d.link_url));
            has = true;
            type = d.link_url.includes('.gif') 
                ? TYPES.GIF
                : d.link_url.includes('.mp4') 
                    ? TYPES.VIDEO 
                    : TYPES.IMAGE
        }

        if (has) {
            div.appendChild(g);
        }

        div.classList.add(type)
        if (type == TYPES.NOMEDIA) div.classList.add('hidden') // default filter
        feed.appendChild(div)
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

const filter = document.getElementById('filter-all')

filter.addEventListener('click', (e) => {
    const type = e.target.dataset.type
    const isActive = e.target.classList.contains('active')
    if (!isActive) {
        const posts = Array.from(document.querySelectorAll('.post.hidden'))
        posts.forEach(post => post.classList.remove('hidden'))
        e.target.classList.add('active')
    }
    else {
        const posts = Array.from(document.querySelectorAll('.post.type_nomedia'))
        posts.forEach(post => post.classList.add('hidden'))
        e.target.classList.remove('active')
    }
})

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