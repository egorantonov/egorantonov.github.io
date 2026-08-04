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
    return (meta[id].s.gif ?? meta[id].s.u).replace(/&amp;/g, "&");
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

function getUpvotes(data) {
    return data.ups > 0 ? `🔼${data.ups} ` : ''
}

function getComments(data) {
    return data.num_comments > 0 ? `🗣${data.num_comments} ` : ''
}

function getDate(data) {
    return new Date(data.created * 1e3).toLocaleString()
}

function getRatioBar(data) {
    const ratio = data.upvote_ratio * 100
    const ups = document.createElement('div')
    ups.style.width = `${ratio}%`
    ups.style.height = '2px'
    ups.style.backgroundColor = '#0b7'
    const downs = document.createElement('div')
    downs.style.width = `${100-ratio}%`
    downs.style.height = '2px'
    downs.style.backgroundColor = '#b00'
    const ratioContainer = document.createElement('div')
    ratioContainer.style.display = 'flex'
    ratioContainer.style.maxWidth = '150px'
    ratioContainer.style.minWidth = '100px'
    ratioContainer.style.float = 'right'
    ratioContainer.appendChild(ups)
    ratioContainer.appendChild(downs)

    return ratioContainer
}

function getMedia(data) {
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    let has = false;
    let type = TYPES.NOMEDIA

    if (data.gallery_data && data.media_metadata) {
        data.gallery_data.items.forEach(i => {
            // const img = document.createElement("img");
            // img.src = mediaURL(i.media_id, d.media_metadata);
            gallery.appendChild(createImageByMeta(i.media_id, data.media_metadata));
            has = true;
            type = TYPES.IMAGE
        });

    }

    else if (data.preview) {
        if (data.preview.reddit_video_preview) {
            gallery.appendChild(createVideo(data.preview.reddit_video_preview.fallback_url));
            has = true
            type = TYPES.IMAGE
        }

        else if (data.preview.images.length == 1
            && data.preview.images[0].source.url.includes('.gif')
            && data.url.includes('.gif')) {
            gallery.appendChild(createImage(data.url));
            has = true;
            type = TYPES.GIF
        }

        else {
            data.preview.images.forEach(i => {
                gallery.appendChild(createImage(i.source.url))
                has = true;
                type = TYPES.IMAGE
            });
        }
    }

    if (data.media && data.media.reddit_video) {
        gallery.appendChild(createVideo(data.media.reddit_video.fallback_url));
        has = true;
        type = TYPES.VIDEO
    }

    if (!has && data.link_url && data.link_url.includes('i.redd.it')) {
        gallery.appendChild(createImage(data.link_url));
        has = true;
        type = data.link_url.includes('.gif') 
            ? TYPES.GIF
            : data.link_url.includes('.mp4') 
                ? TYPES.VIDEO 
                : TYPES.IMAGE
    }

    return {gallery: has ? gallery : false, type}
}

function render(json) {
    const feed = document.getElementById("feed");
    feed.innerHTML = "";
    const posts = json.data.children;
    let index = 1;
    posts.forEach(p => {
        const d = p.data;
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML += `
<div class="flex space-between">
    <a target="_blank" href="https://www.reddit.com/r/${d.subreddit}.json">
        r/${d.subreddit}
    </a>
    <span>${getDate(d)}${getUpvotes(d)}${getComments(d)}</span>
</div>
<h3>${d.title || d.link_title || ""}</h3>
${getSelfText(d)}
<div class="flex space-between">
    <a target="_blank" href="https://www.reddit.com/u/${d.author}.json">
        <span>u/${d.author}</span>
    </a>
    ${createCount(d.gallery_data?.items?.length)}
    <a target="_blank" class="post-link" href="https://reddit.com${d.permalink}" >
        ${d.name}#${index}
    </a>
</div>
`;
        div.appendChild(getRatioBar(d))
        const media = getMedia(d)
        if (media?.gallery) {
            div.appendChild(media.gallery)
        }

        div.classList.add(media.type)
        if (media.type == TYPES.NOMEDIA) div.classList.add('hidden') // default filter
        feed.appendChild(div)
        index++
    })

    const last = posts[posts.length - 1].data;



    const footer = document.createElement("footer");
    footer.innerHTML = `

<h2>Следующая страница</h2>
<p>
    <a target="_blank" href="https://www.reddit.com/u/${last.author}.json?after=${last.name}&limit=100">
        /u/${last.author}
    </a>
</p>
<p>
    <a target="_blank" href="https://www.reddit.com/r/${last.subreddit}.json?after=${last.name}&limit=100">
        /r/${last.subreddit}
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