/**
* Service Worker - Pasti della settimana
* Enables 100% offline access, instant loading, and safe updates.
* LocalStorage data is never touched or affected by service worker lifecycle.
*/
const CACHE_NAME = "pasti-settimana-v1";
// Assets to precache (using relative paths for GitHub Pages subfolder compatibility)
const PRECACHE_ASSETS = [
	"./",
	"./index.html",
	"./style.css",
	"./app.js",
	"./src/logic.js",
	"./src/zip-builder.js",
	"./manifest.webmanifest",
	"./icon.svg",
	"./icon-192.png",
	"./icon-512.png",
	"./apple-touch-icon.png",
	"./favicon.png",
	"./favicon.ico"
];
// Install: precache static files
self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
		// Use addAll with error resilience: cache what succeeds
		return Promise.allSettled(PRECACHE_ASSETS.map((url) => cache.add(url).catch((err) => {
			console.warn(`[SW] Precache fallback for ${url}:`, err);
		})));
	}).then(() => self.skipWaiting()));
});
// Activate: clean up older cache versions, claim clients
self.addEventListener("activate", (event) => {
	event.waitUntil(caches.keys().then((cacheNames) => {
		return Promise.all(cacheNames.map((name) => {
			if (name !== CACHE_NAME) {
				console.log(`[SW] Rimozione vecchia cache: ${name}`);
				return caches.delete(name);
			}
		}));
	}).then(() => self.clients.claim()));
});
// Fetch: Stale-While-Revalidate / Cache First with network fallback
self.addEventListener("fetch", (event) => {
	// Only handle GET requests
	if (event.request.method !== "GET") return;
	const url = new URL(event.request.url);
	// Ignore cross-origin external requests if any
	if (url.origin !== self.location.origin) return;
	event.respondWith(caches.match(event.request).then((cachedResponse) => {
		const fetchPromise = fetch(event.request).then((networkResponse) => {
			if (networkResponse && networkResponse.status === 200) {
				const responseToCache = networkResponse.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseToCache);
				});
			}
			return networkResponse;
		}).catch((error) => {
			// If offline and not in cache, fallback to index.html if navigating
			if (event.request.mode === "navigate") {
				return caches.match("./") || caches.match("./index.html");
			}
			throw error;
		});
		// Return cached response immediately if available, while fetching update in background
		return cachedResponse || fetchPromise;
	}));
});

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6Ijs7Ozs7QUFNQSxNQUFNLGFBQWE7O0FBR25CLE1BQU0sa0JBQWtCO0NBQ3RCO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0FBQ0Y7O0FBR0EsS0FBSyxpQkFBaUIsWUFBWSxVQUFVO0NBQzFDLE1BQU0sVUFDSixPQUFPLEtBQUssVUFBVSxDQUFDLENBQUMsTUFBTSxVQUFVOztFQUV0QyxPQUFPLFFBQVEsV0FDYixnQkFBZ0IsS0FBSyxRQUNuQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxRQUFRO0dBQzVCLFFBQVEsS0FBSyw4QkFBOEIsSUFBSSxJQUFJLEdBQUc7RUFDeEQsQ0FBQyxDQUNILENBQ0Y7Q0FDRixDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssWUFBWSxDQUFDLENBQ2xDO0FBQ0YsQ0FBQzs7QUFHRCxLQUFLLGlCQUFpQixhQUFhLFVBQVU7Q0FDM0MsTUFBTSxVQUNKLE9BQU8sS0FBSyxDQUFDLENBQUMsTUFBTSxlQUFlO0VBQ2pDLE9BQU8sUUFBUSxJQUNiLFdBQVcsS0FBSyxTQUFTO0dBQ3ZCLElBQUksU0FBUyxZQUFZO0lBQ3ZCLFFBQVEsSUFBSSxpQ0FBaUMsTUFBTTtJQUNuRCxPQUFPLE9BQU8sT0FBTyxJQUFJO0dBQzNCO0VBQ0YsQ0FBQyxDQUNIO0NBQ0YsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLFFBQVEsTUFBTSxDQUFDLENBQ3BDO0FBQ0YsQ0FBQzs7QUFHRCxLQUFLLGlCQUFpQixVQUFVLFVBQVU7O0NBRXhDLElBQUksTUFBTSxRQUFRLFdBQVcsT0FBTztDQUVwQyxNQUFNLE1BQU0sSUFBSSxJQUFJLE1BQU0sUUFBUSxHQUFHOztDQUdyQyxJQUFJLElBQUksV0FBVyxLQUFLLFNBQVMsUUFBUTtDQUV6QyxNQUFNLFlBQ0osT0FBTyxNQUFNLE1BQU0sT0FBTyxDQUFDLENBQUMsTUFBTSxtQkFBbUI7RUFDbkQsTUFBTSxlQUFlLE1BQU0sTUFBTSxPQUFPLENBQUMsQ0FBQyxNQUFNLG9CQUFvQjtHQUNsRSxJQUFJLG1CQUFtQixnQkFBZ0IsV0FBVyxLQUFLO0lBQ3JELE1BQU0sa0JBQWtCLGdCQUFnQixNQUFNO0lBQzlDLE9BQU8sS0FBSyxVQUFVLENBQUMsQ0FBQyxNQUFNLFVBQVU7S0FDdEMsTUFBTSxJQUFJLE1BQU0sU0FBUyxlQUFlO0lBQzFDLENBQUM7R0FDSDtHQUNBLE9BQU87RUFDVCxDQUFDLENBQUMsQ0FBQyxPQUFPLFVBQVU7O0dBRWxCLElBQUksTUFBTSxRQUFRLFNBQVMsWUFBWTtJQUNyQyxPQUFPLE9BQU8sTUFBTSxJQUFJLEtBQUssT0FBTyxNQUFNLGNBQWM7R0FDMUQ7R0FDQSxNQUFNO0VBQ1IsQ0FBQzs7RUFHRCxPQUFPLGtCQUFrQjtDQUMzQixDQUFDLENBQ0g7QUFDRixDQUFDIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbInN3LmpzIl0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU2VydmljZSBXb3JrZXIgLSBQYXN0aSBkZWxsYSBzZXR0aW1hbmFcbiAqIEVuYWJsZXMgMTAwJSBvZmZsaW5lIGFjY2VzcywgaW5zdGFudCBsb2FkaW5nLCBhbmQgc2FmZSB1cGRhdGVzLlxuICogTG9jYWxTdG9yYWdlIGRhdGEgaXMgbmV2ZXIgdG91Y2hlZCBvciBhZmZlY3RlZCBieSBzZXJ2aWNlIHdvcmtlciBsaWZlY3ljbGUuXG4gKi9cblxuY29uc3QgQ0FDSEVfTkFNRSA9ICdwYXN0aS1zZXR0aW1hbmEtdjEnO1xuXG4vLyBBc3NldHMgdG8gcHJlY2FjaGUgKHVzaW5nIHJlbGF0aXZlIHBhdGhzIGZvciBHaXRIdWIgUGFnZXMgc3ViZm9sZGVyIGNvbXBhdGliaWxpdHkpXG5jb25zdCBQUkVDQUNIRV9BU1NFVFMgPSBbXG4gICcuLycsXG4gICcuL2luZGV4Lmh0bWwnLFxuICAnLi9zdHlsZS5jc3MnLFxuICAnLi9hcHAuanMnLFxuICAnLi9zcmMvbG9naWMuanMnLFxuICAnLi9zcmMvemlwLWJ1aWxkZXIuanMnLFxuICAnLi9tYW5pZmVzdC53ZWJtYW5pZmVzdCcsXG4gICcuL2ljb24uc3ZnJyxcbiAgJy4vaWNvbi0xOTIucG5nJyxcbiAgJy4vaWNvbi01MTIucG5nJyxcbiAgJy4vYXBwbGUtdG91Y2gtaWNvbi5wbmcnLFxuICAnLi9mYXZpY29uLnBuZycsXG4gICcuL2Zhdmljb24uaWNvJ1xuXTtcblxuLy8gSW5zdGFsbDogcHJlY2FjaGUgc3RhdGljIGZpbGVzXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2luc3RhbGwnLCAoZXZlbnQpID0+IHtcbiAgZXZlbnQud2FpdFVudGlsKFxuICAgIGNhY2hlcy5vcGVuKENBQ0hFX05BTUUpLnRoZW4oKGNhY2hlKSA9PiB7XG4gICAgICAvLyBVc2UgYWRkQWxsIHdpdGggZXJyb3IgcmVzaWxpZW5jZTogY2FjaGUgd2hhdCBzdWNjZWVkc1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsU2V0dGxlZChcbiAgICAgICAgUFJFQ0FDSEVfQVNTRVRTLm1hcCgodXJsKSA9PlxuICAgICAgICAgIGNhY2hlLmFkZCh1cmwpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgW1NXXSBQcmVjYWNoZSBmYWxsYmFjayBmb3IgJHt1cmx9OmAsIGVycik7XG4gICAgICAgICAgfSlcbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9KS50aGVuKCgpID0+IHNlbGYuc2tpcFdhaXRpbmcoKSlcbiAgKTtcbn0pO1xuXG4vLyBBY3RpdmF0ZTogY2xlYW4gdXAgb2xkZXIgY2FjaGUgdmVyc2lvbnMsIGNsYWltIGNsaWVudHNcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignYWN0aXZhdGUnLCAoZXZlbnQpID0+IHtcbiAgZXZlbnQud2FpdFVudGlsKFxuICAgIGNhY2hlcy5rZXlzKCkudGhlbigoY2FjaGVOYW1lcykgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgICBjYWNoZU5hbWVzLm1hcCgobmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChuYW1lICE9PSBDQUNIRV9OQU1FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW1NXXSBSaW1vemlvbmUgdmVjY2hpYSBjYWNoZTogJHtuYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuIGNhY2hlcy5kZWxldGUobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KS50aGVuKCgpID0+IHNlbGYuY2xpZW50cy5jbGFpbSgpKVxuICApO1xufSk7XG5cbi8vIEZldGNoOiBTdGFsZS1XaGlsZS1SZXZhbGlkYXRlIC8gQ2FjaGUgRmlyc3Qgd2l0aCBuZXR3b3JrIGZhbGxiYWNrXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2ZldGNoJywgKGV2ZW50KSA9PiB7XG4gIC8vIE9ubHkgaGFuZGxlIEdFVCByZXF1ZXN0c1xuICBpZiAoZXZlbnQucmVxdWVzdC5tZXRob2QgIT09ICdHRVQnKSByZXR1cm47XG5cbiAgY29uc3QgdXJsID0gbmV3IFVSTChldmVudC5yZXF1ZXN0LnVybCk7XG5cbiAgLy8gSWdub3JlIGNyb3NzLW9yaWdpbiBleHRlcm5hbCByZXF1ZXN0cyBpZiBhbnlcbiAgaWYgKHVybC5vcmlnaW4gIT09IHNlbGYubG9jYXRpb24ub3JpZ2luKSByZXR1cm47XG5cbiAgZXZlbnQucmVzcG9uZFdpdGgoXG4gICAgY2FjaGVzLm1hdGNoKGV2ZW50LnJlcXVlc3QpLnRoZW4oKGNhY2hlZFJlc3BvbnNlKSA9PiB7XG4gICAgICBjb25zdCBmZXRjaFByb21pc2UgPSBmZXRjaChldmVudC5yZXF1ZXN0KS50aGVuKChuZXR3b3JrUmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKG5ldHdvcmtSZXNwb25zZSAmJiBuZXR3b3JrUmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZVRvQ2FjaGUgPSBuZXR3b3JrUmVzcG9uc2UuY2xvbmUoKTtcbiAgICAgICAgICBjYWNoZXMub3BlbihDQUNIRV9OQU1FKS50aGVuKChjYWNoZSkgPT4ge1xuICAgICAgICAgICAgY2FjaGUucHV0KGV2ZW50LnJlcXVlc3QsIHJlc3BvbnNlVG9DYWNoZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldHdvcmtSZXNwb25zZTtcbiAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAvLyBJZiBvZmZsaW5lIGFuZCBub3QgaW4gY2FjaGUsIGZhbGxiYWNrIHRvIGluZGV4Lmh0bWwgaWYgbmF2aWdhdGluZ1xuICAgICAgICBpZiAoZXZlbnQucmVxdWVzdC5tb2RlID09PSAnbmF2aWdhdGUnKSB7XG4gICAgICAgICAgcmV0dXJuIGNhY2hlcy5tYXRjaCgnLi8nKSB8fCBjYWNoZXMubWF0Y2goJy4vaW5kZXguaHRtbCcpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFJldHVybiBjYWNoZWQgcmVzcG9uc2UgaW1tZWRpYXRlbHkgaWYgYXZhaWxhYmxlLCB3aGlsZSBmZXRjaGluZyB1cGRhdGUgaW4gYmFja2dyb3VuZFxuICAgICAgcmV0dXJuIGNhY2hlZFJlc3BvbnNlIHx8IGZldGNoUHJvbWlzZTtcbiAgICB9KVxuICApO1xufSk7XG4iXX0=