(function () {
	var dialog;
	var move_t;
	customElements.whenDefined('ct-dialog').then((c) => {
		dialog = c;
	});
	
	function arrayEqual(a, b) {
		return a.length === b.length &&
			a.every((v, i) => v === b[i]);
	}

	class DataRenderer {
		constructor(fen,tbody) {
			this.fen = fen;
			this.tbody = tbody;
			this.index = 0;
			const training_ui = document.querySelector('opening-training-ui');
			const rep = training_ui._repController;
			this.colour = rep.getCurrentRepertoire().ourColour == 1 ? 'black' : 'white';
			this.moveList = new Set();
			this.repMoves = rep.getOpeningTreeNodeFromPosition(this.fen);
			this.repMoves = this.repMoves || {children: []};
			move_t = move_t || this.repMoves.children[0].move.constructor;
			const spfen = this.fen.split(" ");
			this.moveNR = spfen[5] + (spfen[1] == 'w'? '.' : '..');
			this.tbody.innerHTML = '';
			var gameTable = document.getElementById('lichess-game-list');
			gameTable.classList.add('ct-invisible');
		}

		renderSAN(san,lalg) {
			return '<td class="ct-dt-cell ct-data-table__cell--non-numeric ct-opex-move-san-column-td ">' +
				'<span data-move-lalg="'+lalg+'" class="ct-opex-cand-move">'+
				this.moveNR + san +
				'</span>' +
				'</td>';
		}

		renderPlayedNumber(total) {
			return '<td class="ct-dt-cell ct-opex-num-moves-column-td ">' +
				'<span class="ct-opex-num-moves">' +
				total + '</span>' +
				'</td>';
		}

		renderAverageRating(rating) {
			return '<td class="ct-dt-cell ct-opex-av-rating-column-td ">' + 
				'<span class="ct-opex-avg-elo">' +
				rating + 
				'</span>'+
				'</td>';
		}

		renderResultPercents(wpc, dpc, bpc) {
			return '<td class="ct-dt-cell ct-data-table__cell--non-numeric ct-opex-white-draw-black-column-td "><span class="ct-opex-white-draw-black"><table class="ct-opex-nonterminal-table-outcomes">' +
				'<tbody>' +
				'<tr class="ct-opex-nonterminal-table-outcomes-tr">' +
				'<td class="ct-opex-nonterminal-td-white" style="width:'+wpc+'%;">'+
				(wpc == '0.0' ? '' : wpc + '%') +
				'</td>' +
				'<td class="ct-opex-nonterminal-td-draw" style="width:'+dpc+'%;">'+
				(dpc == '0.0' ? '' : dpc + '%') +
				'</td>' +
				'<td class="ct-opex-nonterminal-td-black" style="width:'+bpc+'%;">'+
				(bpc == '0.0' ? '' : bpc + '%') +
				'</td>' +
				'</tr>' +
				'</tbody>' +
				'</table></span></td>';
		}

		renderGame(game) {
			const result = game.winner ? game.winner == 'white' ? '1-0' : '0-1' : '½-½';
			const text = game.white.name + ' ('+ game.white.rating + ') vs ' +
				game.black.name + ' (' + game.black.rating + ') ' + result;
			return '<td class="ct-dt-cell ct-data-table__cell--non-numeric ct-opex-white-draw-black-column-td">' +
				'<span class="ct-opex-white-draw-black">' +
				'<i title="'+game.speed+'" data-icon="'+DataRenderer.icons[game.speed]+'"></i> '+
				'<a class="ct-db-explorer-terminal-game-link" ' +
				'title="'+ text + ' ' + game.month + '" target="_blank" ' +
				'href="https://lichess.org/'+game.id+'/'+this.colour+'?fen='+this.fen+'">' +
				text + '</a>' +
				'</span></td>';
		}

		renderUserNr(total) {
			return '<span class="ct-opex-num-moves">'+total+'</span>';
		}
		renderUserPerf(perf) {
			return '<span class="ct-opex-perf-elo">'+perf+'</span>';
		}
		renderUserScore(score) {
			const extraClass = score > 0.55 ?
				(this.isMe ? ' ct-opex-good-perf' : ' ct-opex-bad-perf') :
				score < 0.45 ? (this.isMe ? ' ct-opex-bad-perf' : ' ct-opex-good-perf') :
				''
			return '<span class="ct-opex-perf-elo'+extraClass+'">'+(score==''? score : Math.round(score*100))+'</span>';
		}

		renderUserColumns(userTotal, userPerf, userScore) {
			return '<td class="ct-dt-cell ct-opex-num-moves-column-td">'+this.renderUserNr(userTotal)+'</td>' +
				'<td class="ct-dt-cell ct-opex-perf-rating-column-td">'+this.renderUserPerf(userPerf)+'</td>' +
				'<td class="ct-dt-cell ct-opex-perf-rating-column-td">'+this.renderUserScore(userScore)+'</td>';
		}

		static icons = {
			ultraBullet: "",
			bullet: "",
			blitz: "",
			rapid: "",
			classical: "",
			correspondence: "",
			chess960: "",
			kingOfTheHill: "",
			threeCheck: "",
			antichess: "",
			atomic: "",
			horde: ""
		}

		static uciMap = {
			'e8h8': 'e8g8',
			'e8a8': 'e8c8',
			'e1h1': 'e1g1',
			'e1a1': 'e1c1'
		}

		uciToLALG(uci, san) {
			if (!san.startsWith('O-O'))
				return uci;
			return DataRenderer.uciMap[uci];
		}

		renderEngine(score) {
			const ev = score ? score.score : '';
			const rank = score ? score.rank : 3;
			const extraClass = [
				' ct-opex-bad-perf',
				' ct-opex-mistake',
				' ct-opex-inaccuracy',
				'',
				' ct-opex-good-perf'
			];
			return '<span class="ct-opex-perf-elo'+extraClass[rank]+'">'+
				ev+'</span>';
		}

		renderEngineCDB(score) {
			return '<td class="ct-dt-cell ct-opex-perf-rating-column-td">'+
				this.renderEngine(score) + '</td>';
		}

		renderRow(san, lalg, total, aveRating, userTotal, userPerf, userScore, score, scoreLocal, game, wpc, dpc, bpc) {
			const extraClass = this.repMoves.children.find((l=>l.move.toLALG() == lalg)) ?
				' ct-ot-explorer-rep-move-row' : this.moveList.has(lalg) ?
				' ct-ot-explorer-other-move-row' : '';
			return '<tr data-index="'+(this.index++)+'" class="ct-dt-row'+extraClass+'">' +
				this.renderSAN(san,lalg) +
				this.renderPlayedNumber(total) +
				this.renderAverageRating(aveRating) +
				this.renderUserColumns(userTotal, userPerf, userScore) +
				this.renderEngineCDB(score) +
				this.renderEngineCDB(scoreLocal) +
				(game ?
					this.renderGame(game) :
					this.renderResultPercents(wpc.toFixed(1), dpc.toFixed(1), bpc.toFixed(1))) +
				'</tr>';
		}

		renderDate(month) {
			return '<td class="ct-dt-cell ct-opex-last-played-column-td"><span class="ct-opex-num-moves">' +
				month + '</span></td>';
		}

		renderRecentGame(san, lalg, game) {
			const extraClass = this.repMoves.children.find((l=>l.move.toLALG() == lalg)) ?
				' ct-ot-explorer-rep-move-row' : this.moveList.has(lalg) ?
				' ct-ot-explorer-other-move-row' : '';
			return '<tr class="ct-dt-row'+extraClass+'">' +
				this.renderSAN(san,lalg) +
				this.renderDate(game.month) +
				this.renderGame(game) +
				'</tr>';
		}

		data(fen, text) {
			if (fen !== this.fen)
				return true;
			const filter = LichessExplorer.getSettings();
			this.isMe = false;
			if (filter.user.length > 0) {
				var uc = this.colour;
				if (!filter.ownName.find(n => n === filter.user))
					uc = uc === 'white' ? 'black' : 'white';
				else
					this.isMe = true;
				window.postMessage({
					'type': 'Lichess-user',
					'user': filter.user,
					'colour': uc,
					'speeds': filter.userSpeeds.join(','),
					'modes': filter.userModes.join(','),
					'recentGames': filter.userRecentGames,
					'fen': this.fen
				}, 'https://chesstempo.com');
			}
			var movesDone = new Set();
			{
				const moves = document.querySelector('candidate-moves')._data.getAllData();
				const c = this.colour == 'white' ? 0 : 1;
				moves.forEach(e=>{
					if (e.repertoire.ourColour == c)
						this.moveList.add(e.lalg)
				});
			}
			var data = [];
			var index = 0;
			for (var i in text.moves) {
				const m = text.moves[i];
				const lalg = this.uciToLALG(m.uci, m.san);
				movesDone.add(lalg);
				const total = m.white + m.draws + m.black;
				const wpc = m.white / total * 100;
				const dpc = m.draws / total * 100;
				const bpc = m.black / total * 100;
				data.push(this.renderRow(m.san, lalg, total, m.averageRating, '', '', '', null, null, m.game, wpc, dpc, bpc));
			}

			for (var i in this.repMoves.children) {
				const m = this.repMoves.children[i];
				const lalg = m.move.toLALG();
				if (movesDone.has(lalg)) continue;

				data.push(this.renderRow(m.label, lalg, '', '', '', '', '', null, null, null, 0,0,0))
			}
			this.tbody.innerHTML = data.join("");
			return true;
		}

		userData(fen,text) {
			if (fen !== this.fen)
				return true;
			var uMap = {};
			var rows = [];
			for (var i in text.moves) {
				const m = text.moves[i];
				const total = m.white + m.draws + m.black;
				const score = (m[this.isMe ? this.colour : this.colour === 'white' ? 'black' : 'white']+m.draws/2)/total;
				const lalg = this.uciToLALG(m.uci, m.san);
				uMap[m.uci] = [lalg, m.san];
				const sanSpan = this.tbody.querySelector('[data-move-lalg='+lalg+']');
				if (sanSpan) {
					const row = sanSpan.parentNode.parentNode;
					row.cells[3].innerHTML = this.renderUserNr(total);
					row.cells[4].innerHTML = this.renderUserPerf(m.performance);
					row.cells[5].innerHTML = this.renderUserScore(score);
				} else {
					rows.push(this.renderRow(m.san, lalg, '', '', total, m.performance, score, null, null, null, 0.0, 0.0, 0.0));
				}
			}
			if (rows.length > 0)
				this.tbody.insertAdjacentHTML('beforeend', rows.join(''));

			var gameTable = document.getElementById('lichess-game-list');

			if (!text.recentGames || text.recentGames.length == 0) {
				gameTable.classList.add('ct-invisible');
				return;
			}
			var tbody = gameTable.querySelector('tbody');
			rows = [];
			for (var i in text.recentGames) {
				const g = text.recentGames[i];
				const [lalg, san] = uMap[g.uci];
				rows.push(this.renderRecentGame(san, lalg, g));
			}

			tbody.innerHTML = rows.join('');
			gameTable.classList.remove('ct-invisible');
			return true;
		}

		engineCDB(fen,text) {
			if (fen !== this.fen)
				return true;
			var rows = [];
			const best = parseInt(text[0].score);
			for (var i in text) {
				const score = text[i];
				const diff = Math.abs(best - score.score);
				this.addRank(score, best);
				const lalg = score.move;
				const sanSpan = this.tbody.querySelector('[data-move-lalg='+lalg+']');
				if (sanSpan) {
					const row = sanSpan.parentNode.parentNode;
					row.cells[6].innerHTML = this.renderEngine(score);
				} else if (score.rank > 2) {
					const san = move_t.createFromLalg(lalg,this.fen).toSAN();
					rows.push(this.renderRow(san, lalg, '', '', '', '', '', score, null, null, 0.0, 0.0, 0.0));
				}
			}
			if (rows.length > 0)
				this.tbody.insertAdjacentHTML('beforeend', rows.join(''));
			return true;
		}

		addRank(score, best) {
			const diff = Math.abs(best - score.score);
			if (diff < 10)
				score.rank = 4;
			else if (diff < 50)
				score.rank = 3;
			else if (diff < 100)
				score.rank = 2;
			else if (diff < 350)
				score.rank = 1;
			else
				score.rank = 0;
		}

		engineLocal(fen,text) {
			if (fen !== this.fen)
				return true;
			var rows = [];
			const best = parseInt(text[0].score);
			for (var i in text) {
				const score = text[i];
				this.addRank(score, best);
				const lalg = score.pv;
				if (!lalg)
					score.rank = 0;
				const sanSpan = this.tbody.querySelector('[data-move-lalg='+lalg+']');
				if (sanSpan) {
					const row = sanSpan.parentNode.parentNode;
					row.cells[7].innerHTML = this.renderEngine(score);
				} else if (score.rank > 0) {
					const san = move_t.createFromLalg(lalg,this.fen).toSAN();
					rows.push(this.renderRow(san, lalg, '', '', '', '', '', null, score, null, 0.0, 0.0, 0.0));
				}
			}
			if (rows.length > 0)
				this.tbody.insertAdjacentHTML('beforeend', rows.join(''));
			return true;
		}
	}

	class LichessData extends HTMLElement {
		constructor() {
			super();
			console.debug('LichessData construct');
			this.eMessage = (e) => {
				if (e.source !== window)
					return false;
				if (e.data.type === 'Lichess-data')
					return this.setData(e.data.fen,e.data.data);
				if (e.data.type === 'Lichess-user-data')
					return this.setUserData(e.data.fen,e.data.data);
				if (e.data.type === 'Engine-cdb')
					return this.setCDB(e.data.fen,e.data.data);
				if (e.data.type === 'Engine-local')
					return this.setLocal(e.data.fen,e.data.data);
				return false;
			};
		}
		connectedCallback() {
			console.debug('LichessData connect');
			this._render();
			window.addEventListener('message', this.eMessage, false);
		}
		disconnectedCallback() {
			console.debug('LichessData disconnect');
			window.removeEventListener('message', this.eMessage, false);
		}

		_selectMove(e) {
			const t = e.currentTarget.getAttribute("data-move-lalg");
			if (e.currentTarget.closest('tr.ct-ot-explorer-other-move-row')) {
				const cand = document.querySelector('candidate-moves');
				const moves = cand._data.getAllData();
				const colour = this.renderer.colour == 'white' ? 0 : 1;
				const selected = moves.find(e=>e.lalg===t && e.repertoire.ourColour === colour);
				cand._datatable.fire('rowClicked', {row: selected});
			} else {
				var training = document.querySelector('opening-training-ui');
				training._explorer.fire("explorerMoveClicked",{
					lalg: t,
					fen: this.fen
				});
			}
		}

		_render() {
			var training = document.querySelector('opening-training-ui');
			training._del.delegate(this, 'tap', '.ct-opex-cand-move', this._selectMove, this);
			this.innerHTML = '<table class="ct-data-table">' +
				'<thead>' +
				'<tr>' +
				'<th data-index="0" class="ct-dt-header ct-data-table__cell--non-numeric ct-opex-move-san-column"></th>' +
				'<th data-index="1" class="ct-dt-header ct-dt-sortable ct-data-table__header--sorted-descending ct-opex-num-moves-column">#</th>' +
				'<th data-index="2" class="ct-dt-header ct-dt-sortable ct-opex-av-rating-column">Avg</th>' +
				'<th data-index="3" class="ct-dt-header ct-dt-sortable ct-opex-num-moves-column">User#</th>' +
				'<th data-index="4" class="ct-dt-header ct-dt-sortable ct-opex-perf-rating-column">Perf</th>' +
				'<th data-index="5" class="ct-dt-header ct-dt-sortable ct-opex-perf-rating-column">Res%</th>' +
				'<th data-index="6" class="ct-dt-header ct-dt-sortable ct-opex-perf-rating-column">CDB</th>' +
				'<th data-index="7" class="ct-dt-header ct-dt-sortable ct-opex-perf-rating-column">CP</th>' +
				'<th data-index="8" class="ct-dt-header ct-dt-sortable ct-data-table__cell--non-numeric ct-opex-white-draw-black-column">White/Draw/Black</th>' +
				'</tr>' +
				'</thead>' +
				'<tbody>' +
				'</tbody>' +
			'</table>' +
			'<table id="lichess-game-list" class="ct-data-table ct-invisible">' +
				'<thead><tr>' +
				'<th data-index="0" class="ct-dt-header ct-opex-move-san-column">Move</th>' +
				'<th data-index="1" class="ct-dt-header ct-opex-last-played-column">Date</th>' +
				'<th data-index="2" class="ct-dt-header ct-data-table__cell--non-numeric ct-opex-white-draw-black-column">Game</th>' +
				'</tr></thead>' +
				'<tbody></tbody>'+
			'</table>';
		}

		get fen() {
			return this.renderer && this.renderer.fen;
		}

		setPosition(fen) {
			this.renderer = new DataRenderer(fen,this.querySelector('tbody'));
			var filter = LichessExplorer.getSettings();
			window.postMessage({
				'type': 'Lichess',
				'fen': fen,
				'speeds': filter.speeds.join(','),
				'ratings': filter.ratings.join(','),
				'moves': filter.moves
			}, 'https://chesstempo.com');
		}

		setUserData(fen,text) {
			console.log('lichess.setUserData', fen, text);
			return this.renderer.userData(fen, text);
		}

		setCDB(fen, text) {
			console.debug('lichess.setCDB', fen, text);
			return this.renderer.engineCDB(fen, text);
		}

		setLocal(fen, text) {
			console.debug('lichess.setLocal', fen, text);
			return this.renderer.engineLocal(fen, text);
		}

		setData(fen,text) {
			console.log('lichess.setData', fen, text);
			return this.renderer.data(fen,text);
		}
	};

	class LichessExplorer extends HTMLElement {
		constructor() {
			super();
			console.debug('Lichess constructed');
			this.engineFens = [];
			this.inTraining = !1;
		}
		connectedCallback() {
			console.debug('Lichess connected');
			this._render();
		}
		disconnectedCallback() {
			console.debug('Lichess disconnected');
		}

		_render() {
			this.innerHTML = '<lichess-data class="ct-elev--z2 ct-opex-table ct-datatable-has-heading"></lichess-data>';
			var comment = document.querySelector('.ct-opening-comments-collapsible');
			if (comment) {
				var engine = document.querySelector('[label=Engine]');
				comment.remove();
				engine.remove();
			}
			this.connectCT();
			const collapsible = this._getCollapsible();
			if (collapsible) {
				var training = document.querySelector('opening-training-ui');
				training._del.delegate(collapsible.querySelector('.ct-collapsible-header-content'),
					'tap', '.ct-settings-action', this.settings.bind(this));
				training._del.delegate(collapsible.querySelector('.ct-collapsible-header-content'),
					'tap', '.ct-engine-action', this.engineQuery.bind(this));
			}
		}

		startTraining(e, t) {
			const training_ui = document.querySelector('opening-training-ui');
			const alreadyIn = training_ui._inTraining;
			if (!alreadyIn) {
				const oec = document.querySelector(".ct-opening-explorer-collapsible");
				const otc = document.querySelector(".ct-opening-tree-collapsible");
				const occ = document.querySelector(".ct-candidates-collapsible");				
				this.explorerWasOpen = oec.isExpanded();
				this.treeWasOpen = otc.isExpanded();
				this.candidatesWasOpen = occ.isExpanded();

				oec.classList.add('ct-invisible');
				otc.classList.add('ct-invisible');
				occ.classList.add('ct-invisible');
				this._getCollapsible().classList.add('ct-invisible');
			}
			this.origStartTraining(e, t);
		}

		stopTraining() {
			const training_ui = document.querySelector('opening-training-ui');
			const isTraining = training_ui._inTraining;
			this.origStopTraining();
			if (!isTraining)
				return;

			const oec = document.querySelector(".ct-opening-explorer-collapsible");
			const otc = document.querySelector(".ct-opening-tree-collapsible");
			const occ = document.querySelector(".ct-candidates-collapsible");				
			if (this.explorerWasOpen)
				oec.expand();
			if (this.treeWasOpen) 
				otc.expand();
			if (this.candidatesWasOpen)
				occ.expand();

			oec.classList.remove('ct-invisible');
			otc.classList.remove('ct-invisible');
			occ.classList.remove('ct-invisible');
			this._getCollapsible().classList.remove('ct-invisible');

			if (!this.fen || this.fen === this.data().fen)
				return;
			const explorer = document.querySelector('opening-explorer');
			explorer.setPosition(this.fen);
		}

		connectCT() {
			if (this.origSetPosition) return;
			const explorer = document.querySelector('opening-explorer');
			const training_ui = document.querySelector('opening-training-ui');
			this.origSetPosition = explorer.setPosition.bind(explorer);
			explorer.setPosition = (fen) => {
				this.fen = fen;
				if (training_ui._inTraining)
					return;
				this.setPosition(fen);
				this.origSetPosition(fen);
			};

			this.origStartTraining = training_ui._startTrainingRepertoire.bind(training_ui);
			this.origStopTraining = training_ui._finishTrainingRepertoire.bind(training_ui);
			training_ui._startTrainingRepertoire = this.startTraining.bind(this);
			training_ui._finishTrainingRepertoire = this.stopTraining.bind(this);

			var listeners = training_ui._del._listeners.get(document);
			var start = listeners.tap.find(e=>e.selector==='.ct-start-training');
			var stop = listeners.tap.find(e=>e.selector==='.ct-finish-training');

			start.context = null;
			start.callback = training_ui._startTrainingRepertoire;
			stop.context = null;
			stop.callback = training_ui._finishTrainingRepertoire;
		}

		engineQuery(e) {
			if (this.engineFens.find(e=>e===this.data().fen))
				return false;

			console.debug("Engine analysis");
			this.engineFens.push(this.data().fen);

			postMessage({
				type: 'engine-analysis',
				fen: this.data().fen
			}, 'https://chesstempo.com');

			document.querySelector('.ct-engine-action').classList.add('ct-ot-move-disabled');
			e.preventDefault();
			return false;
		}

		settings(e) {
			console.debug("Open Lichess Explorer settings");
			dialog.create({
				dimming: !1,
				modal: !1,
				title: "Lichess settings",
				content: "<div><lichess-explorer-filter></lichess-explorer-filter></div>",
				buttons: [{
					label: "Cancel",
					accent: !1,
					action: e=>{
						e.dialog.close()
					}
				}, {
					label: "Filter",
					accent: !0,
					action: e=>{
						let t = e.dialog.querySelector("lichess-explorer-filter");
						this.applyFilterChanges(t.getFilterChanges());
						e.dialog.close();
					}
				}]
			});
			e.preventDefault();
			return false;
		}

		applyFilterChanges(changes) {
			console.debug(changes);
			if (changes.lichessChanged)
				this.setPosition(this.data().fen);
			else if (changes.userChanged)
				this.setPosition(this.data().fen);
		}

		data() {
			return this.firstElementChild;
		}

		setHeader() {
			var head = ['Lichess'];
			const filter = LichessExplorer.getSettings();
			const user = filter.user;
			if (user.length > 0)
				head.push('(' + user + ')');
			head.push(
				'<span class="ct-datatable-action ct-engine-action" title="Request CDB analysys" aria-label="Filter Lichess">' +
				'<ct-icon name="cached"><i class="material-icons">cached</i></ct-icon>' +
				'</span>'
			);
			head.push(
				'<span class="ct-datatable-action ct-settings-action" title="Filter Lichess" aria-label="Filter Lichess">' +
				'<ct-icon name="filter_list"><i class="material-icons">filter_list</i></ct-icon>' +
				'</span>'
			);
			this._getCollapsible().setHeaderContent(head.join(' '));
		}

		setPosition(fen) {
			console.debug('lichess.setPosition: ', fen);
			this.setHeader();
			const eicon = document.querySelector('.ct-engine-action');
			if (this.engineFens.find(e=>e===fen))
				eicon.classList.add('ct-ot-move-disabled');
			else
				eicon.classList.remove('ct-ot-move-disabled');
			this.data().setPosition(fen);
		}

		_getCollapsible() {
			var c = this.parentNode;
			for (; c != null && c.nodeName != "CT-COLLAPSIBLE";)
				c = c.parentNode;
			return c;
		}

		static storageId = 'lichess-explorer';
		static defaultSettings = {
			speeds: ['blitz', 'rapid', 'classical', 'correspondence'],
			ratings: ['2000', '2200', '2500'],
			moves: 20,
			ownName: [],
			user: '',
			userSpeeds: ['blitz', 'rapid', 'classical', 'correspondence'],
			userModes: ['casual','rated'],
			userRecentGames: 8
		};
		static getSettings() {
			var data = localStorage.getItem(LichessExplorer.storageId);
			function copyDefaults(data) {
				for (var i in LichessExplorer.defaultSettings)
					if (!(i in data))
						data[i] = LichessExplorer.defaultSettings[i];
				return data;
			}
			return data ? copyDefaults(JSON.parse(data)) :
				LichessExplorer.defaultSettings;
		}
		static setSettings(data) {
			localStorage.setItem(LichessExplorer.storageId, JSON.stringify(data));
		}
	};

	class LichessExplorerFilter extends HTMLElement {
		constructor() {
			super();
		}

		connectedCallback() {
			this._render();
		}

		_render() {
			this.filterData = LichessExplorer.getSettings();
			var s = (l, n) => {
				return {
					label: l,
					value: n,
					checked: !!this.filterData.speeds.find(e => e === n)
				}
			};
			var um = (l, n) => {
				return {
					label: l,
					value: n,
					checked: !!this.filterData.userModes.find(e => e === n)
				}
			};
			var us = (l, n) => {
				return {
					label: l,
					value: n,
					checked: !!this.filterData.userSpeeds.find(e => e === n)
				}
			};
			var r = (l) => {
				return {
					label: l,
					value: l,
					checked: !!this.filterData.ratings.find(e => e === l)
				}
			};
			var form = {
				children: [{
					type: 'CheckboxGroup',
					label: 'Time controls',
					name: 'speeds',
					choices: [
						s('Ultra Bullet','ultraBullet'),
						s('Bullet','bullet'),
						s('Blitz','blitz'),
						s('Rapid','rapid'),
						s('Classical','classical'),
						s('Correspondence','correspondence')
					]
				},{
					type: 'CheckboxGroup',
					name: 'ratings',
					label: 'Ratings',
					choices: [
						r('600'),
						r('1000'),
						r('1200'),
						r('1400'),
						r('1600'),
						r('1800'),
						r('2000'),
						r('2200'),
						r('2500')
					]
				}, {
					type: 'SingleRangeSlider',
					label: 'The maximum number of moves',
					minLabel: '0',
					maxLabel: '40',
					containerId: 'moves',
					name: 'moves',
					minimum: 1,
					maximum: 40,
					initialValue: this.filterData.moves,
					step: 1
				}, {
					type: 'TextField',
					name: 'ownName',
					value: this.filterData.ownName.join(','),
					label: 'My usernames',
					hint: 'Comma separate list of my Lichess usernames. '+
						'They are used to select colour for user search.'
				}, {
					type: 'TextField',
					name: 'user',
					value: this.filterData.user,
					label: 'Username to explore'
				}, {
					type: 'CheckboxGroup',
					label: 'Time controls for user',
					name: 'userSpeeds',
					choices: [
						us('Ultra Bullet','ultraBullet'),
						us('Bullet','bullet'),
						us('Blitz','blitz'),
						us('Rapid','rapid'),
						us('Classical','classical'),
						us('Correspondence','correspondence')
					]
				},{
					type: 'CheckboxGroup',
					label: 'Rating modes',
					name: 'userModes',
					choices: [
						um('Casual','casual'),
						um('Rated','rated')
					]
				}, {
					type: 'SingleRangeSlider',
					label: 'The number of recent games',
					minLabel: '0',
					maxLabel: '8',
					containerId: 'userRecentGames',
					name: 'userRecentGames',
					minimum: 0,
					maximum: 8,
					initialValue: this.filterData.userRecentGames,
					step: 1
				}]
			}
			this.innerHTML = '<ct-form><script type="application/json" class="ct-config-data">' +
				JSON.stringify(form) + '</script></ct-form>';
			setTimeout(() => {this.getForm().layout()}, 0);
		}

		disconnectedCallback() {
		}

		getForm() {
			return this.querySelector("ct-form");
		}

		getFilterChanges() {
			var filter = this.getForm().getFormJSON();
			filter.ownName = filter.ownName.split(/\s*,\s*/);
			console.debug(filter);
			filter.moves = document.getElementById('moves').getValue();
			filter.userRecentGames = document.getElementById('userRecentGames').getValue();
			LichessExplorer.setSettings(filter);
			return {
				lichessChanged: !arrayEqual(this.filterData.speeds, filter.speeds) ||
					!arrayEqual(this.filterData.ratings, filter.ratings) ||
					this.filterData.moves !== filter.moves,
				userChanged: !arrayEqual(this.filterData.ownName, filter.ownName) ||
					!arrayEqual(this.filterData.userSpeeds, filter.userSpeeds) ||
					!arrayEqual(this.filterData.userModes, filter.userModes) ||
					this.filterData.user !== filter.user ||
					this.filterData.userRecentGames !== this.filterData.userRecentGames
			};
		}
	};

	customElements.define('lichess-explorer-filter', LichessExplorerFilter);

	function setupLichess() {
		console.debug('setupLichess')
		let promise = window.customElements.whenDefined('opening-explorer');
		promise.then((value) => {
			console.debug('opening-explorer ready');
			window.customElements.define('lichess-explorer', LichessExplorer);
			window.customElements.define('lichess-data', LichessData);

			const collapsibles = document.querySelectorAll('ct-collapsible:not([persist-id])');
			collapsibles.forEach(e=>{
				e.setAttribute('persist-id', e.getAttribute('label'));
				e._init();
			});

			let rightPanel = document.querySelector('.ct-ot-right-panel');
			let collapsible = document.createElement('ct-collapsible');
			collapsible.setAttribute('icon', 'storage');
			collapsible.setAttribute('label', 'Lichess');
			collapsible.setAttribute('persist-id', 'Lichess-collapsible');
			collapsible.innerHTML = '<lichess-explorer class="ct-opening-explorer"></lichess-explorer>';

			rightPanel.appendChild(collapsible);
		});
	};
	setupLichess();
} ());
