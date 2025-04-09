// ==UserScript==
// @name        Bluesky video embedder
// @namespace   Violentmonkey Scripts
// @match       https://embed.bsky.app/*
// @grant       none
// @version     1.0
// @homepageURL https://github.com/rimbas/bsky-video-embed
// @downloadUrl https://github.com/rimbas/bsky-video-embed/raw/refs/heads/master/bsky-video-embed.user.js
// @author      Rimbas
// @description 09/04/2025, 18:02:08
// @require     https://cdn.jsdelivr.net/npm/hls.js@1
// ==/UserScript==

let videoElement;
const re = /profile\/(?<profile>[^\/]+)\/post\/(?<post>[^\/\?]+)/;
const isVideoPlaying = video => !!(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2);

const embedObserver = new MutationObserver(async (mutations, observer)  => {
	const t = mutations[0].target;
	for (const a of t.querySelectorAll("a")) {
		if (a.href == undefined) continue;
		let match = a.href.match(re);
		if (match == undefined) continue;
		const { profile, post } = match.groups;
		if (profile == undefined || post == undefined) continue;
		const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${profile}/app.bsky.feed.post/${post}&depth=1`
		const data = await (await fetch(url)).json();

		if (!data.thread) continue;
		if (data?.thread?.post?.embed?.["$type"] !== "app.bsky.embed.video#view") continue;

		const thumbnail = t.querySelector('img[src^="https://video"]');
		if (thumbnail == undefined) continue;
		const parentElement = thumbnail.parentElement;

		parentElement.addEventListener("click", async (event) => {
			event.stopImmediatePropagation();
			event.stopPropagation();

			if (videoElement) {
				return isVideoPlaying(videoElement) ? await videoElement.pause() : await videoElement.play();
			}

			event.preventDefault();

			const video = document.createElement("video");
			video.controls = true;
			video.poster = data.thread.post.embed.thumbnail;
			video.playsInline = true;
			video.preload = "auto";

			parentElement.replaceChildren(video);
			videoElement = video;

			const hls = new Hls();
			hls.attachMedia(video);
			hls.on(Hls.Events.MEDIA_ATTACHED, () => {
				hls.loadSource(data.thread.post.embed.playlist);
			});

			await video.play();
		});

		embedObserver.disconnect();
		parentElement.style.cursor = "pointer";
		const note = document.createElement("div")
		note.textContent = "✔ Video embedded";
		note.style.position = "absolute"
		note.style.top = 0;
		note.style.left = 0;
		note.style.color = "white";
		note.style.background = "rgba(0, 0, 0, 50%)";
		note.style.padding  = ".25rem";
		note.style.paddingRight = ".5rem";
		note.style.borderRadius = ".5rem";
		note.style.borderTopLeftRadius = "0";
		parentElement.insertBefore(note, parentElement.firstChild);

		break;
	}

});

embedObserver.observe(document.body, {
	childList: true,
	subtree: true,
});
