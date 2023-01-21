(function() {
	const uri = 'ws://localhost:8080/';
	var ws = null;
	class EngineSocket extends WebSocket {
		constructor(uri, timeout) {
			super(uri);

			this.timeout = Math.min((timeout || 1000)*2, 600*1000);
			this.fen = null;

			this.onopen = this.OnOpen.bind(this);
			this.onmessage = this.OnMessage.bind(this);
			this.onerror = this.OnError.bind(this);
			this.onclose = this.OnClose.bind(this);
		}

		OnOpen(ev) {
			this.timeout = undefined;
			console.debug("EngineSocket::onopen", ev);
		}
		OnMessage(ev) {
			var data =  JSON.parse(ev.data)
			var idx = data.findIndex((d) => d.type == "best");
			if (idx != -1) {
				if (idx > 0) {
					window.postMessage({
						'type': 'Engine-local',
						'fen': this.fen,
						'data': data.slice(0, idx)
					}, 'https://chesstempo.com');
				}
				this.fen = null;
				data.splice(0, idx + 1);
				if (!data.length)
					return;
			}
			do {
				idx = data.findIndex(((d) => d.type == "start"));
				if (idx != -1) {
					const d = data[idx];
					this.fen = d.fen;
					data.splice(0, idx + 1);
					if (!data.length)
						return;
				}
			} while(idx != -1);
			window.postMessage({
				'type': 'Engine-local',
				'fen': this.fen,
				'data': data
			}, 'https://chesstempo.com');
		}
		OnError(ev) {
			console.debug("EngineSocket::onerror", ev);
		}
		OnClose(ev) {
			console.debug("EngineSocket::onclose", ev);
			this.reconnect();
		}

		send(msg) {
			super.send(JSON.stringify(msg));
		}

		reconnect() {
			setTimeout(() => {ws = new EngineSocket(uri, this.timeout);}, this.timeout);
		}

	}

	class Fetcher {
		constructor(url)
		{
			this.url = url;
		}

		promise(resolve, reject)
		{
			this.resolve = resolve;
			this.reject = reject;
		}

		fetch()
		{
			console.debug("doFetch", this.url);
			this.resolve(fetch(this.url));
		}

		clear()
		{
			console.debug("reject", this.url);
			this.reject({ok: false, message: "canceled request", canceledL: true});
		}
	};

	class LichessFetch {
		constructor()
		{
			this.queue = [];
		}

		fetch(url)
		{
			console.debug("fetch", url);
			var fetcher = new Fetcher(url);
			var promise = new Promise(fetcher.promise.bind(fetcher));
			const isEmpty = !this.queue.length;
			this.queue.push(fetcher);
			if (isEmpty)
				fetcher.fetch();
			return promise.then(this.fetchNext.bind(this),
				(reason) => {
					console.debug("fail", reason);
					if (!reason.canceledL)
						this.fetchNext()
					return reason;
				});
		}

		fetchNext(response)
		{
			console.debug("fetch next", this.queue.length, response);
			if (response !== undefined && response.status == 429) {
				setTimeout(this.fetchNext.bind(this), 60*1000);
				return response;
			}
			this.queue.shift();
			if (this.queue.length)
				this.queue[0].fetch();
			return response;
		}

		clear()
		{
			console.debug("fetch clear", this.queue.length);
			for (var i = 1; i < this.queue.length; i++)
				this.queue[i].clear();
			this.queue.splice(1, this.queue.length - 1);
		}
	}

	ws = new EngineSocket(uri);
	var Lichess = new LichessFetch();

	window.addEventListener('message', (e) => {
		if (e.source !== window)
			return false;
		if (e.data.type === 'Lichess') {
			var request = new XMLHttpRequest;
			const variant = 'standard';
			const topG = 0;
			const recentG = 0;
			Lichess.clear();
			var stream = Lichess.fetch('https://explorer.lichess.ovh/lichess' +
				'?variant=' + variant +
				'&fen=' + e.data.fen +
				'&speeds=' + e.data.speeds +
				'&ratings=' + e.data.ratings +
				'&moves=' + e.data.moves +
				'&topGames=' + topG +
				'&recentGames=' + recentG
			);

			stream.then((response) => {
				console.debug("Lichess explorer: ", response);
				if (!response.ok) {
					return;
				}
				response.text().then((text) => {
					console.debug("Lichess explorer text");
					window.postMessage({
						'type': 'Lichess-data',
						'fen': e.data.fen,
						'data': JSON.parse(text)
					}, 'https://chesstempo.com');

					var stream = fetch('http://www.chessdb.cn/cdb.php' +
						'?action=queryall'+
						'&board='+ e.data.fen
					);

					if (ws.readyState == ws.OPEN) {
						ws.send({
							"type": "position",
							"fen": e.data.fen ,
							"depth": 29
						}, e.data.fen);
					}

					stream.then(response => {
						if (!response.ok) {
							console.error(response.status + ' ' + response.statusText);
							return;
						}
						response.text().then((text)=>{
							const arr = text.split('|');
							const keys = ['move','score','rank'];
							const json = arr.map(x => {
								const elem = x.split(',');
								var obj = {};
								elem.forEach(e => {
									const pair = e.split(':');
									if (keys.find(k=> k===pair[0]))
										obj[pair[0]] = pair[1];
								});
								return obj;
							});
							window.postMessage({
								'type': 'Engine-cdb',
								'fen': e.data.fen,
								'data': json
							}, 'https://chesstempo.com');
						});
					});
				});
			});
			console.debug('Explorer query sent');
			return true;
		} else if (e.data.type === 'Lichess-user') {
			const variant = 'standard';
			const stream = Lichess.fetch('https://explorer.lichess.ovh/player' +
				'?player=' + e.data.user +
				'&color=' + e.data.colour +
				'&variant=' + variant +
				'&fen=' + e.data.fen +
				'&speeds=' + e.data.speeds +
				'&modes=' + e.data.modes +
				'&recentGames=' + e.data.recentGames
			);
			const readStream = doMessage => response => {
				const stream = response.body.getReader();
				const matcher = /\r?\n/;
				const empty_matcher = /^\s*$/
				const decoder = new TextDecoder;
				const decodeParams = {stream: true};

				let buf = '';

				const loop = () =>
					stream.read().then(({done, value}) => {
						if (done) {
							console.debug("End of user data");
							if (buf.length > 0)
								doMessage(buf);
						} else {
							const chunk = decoder.decode(value, decodeParams);
							buf += chunk;

							const parts = buf.split(matcher).filter(e=>!e.match(empty_matcher));
							if (parts.length > 0)
								buf = parts[parts.length - 1];
							else
								buf = '';
							if (parts.length > 1)
								doMessage(parts[parts.length - 2]);
							return loop();
						}
					});
				return loop();
			}
			const onMessage = (message) => {
				console.debug('User data received');
				window.postMessage({
					'type': 'Lichess-user-data',
					'fen': e.data.fen,
					'data': JSON.parse(message)
				}, 'https://chesstempo.com');
			};
			stream.then(readStream(onMessage));
			console.debug('User query sent');
			return true;
		} else if (e.data.type === 'engine-analysis') {
			var stream = fetch('http://www.chessdb.cn/cdb.php' +
				'?action=queue'+
				'&board='+ e.data.fen
			);

			stream.then(response => {
				if (!response.ok) {
					console.error('cdb analysis failed', response);
					return;
				}
				response.text().then((text)=>{
					console.debug('cdb analysis', text);
				});
			});
			return true;
		}
		return false;
	}, false);

	let s = document.createElement('script');
	s.src = chrome.runtime.getURL('lichess-explorer.js');
	s.onload = function() {
		this.remove();
	};
	let css = document.createElement('link');
	css.rel = 'stylesheet';
	css.type = 'text/css';
	css.href = chrome.runtime.getURL('lichess-explorer.css');

	(document.head || document.documentElement).appendChild(s);
	(document.head || document.documentElement).appendChild(css);

})();
