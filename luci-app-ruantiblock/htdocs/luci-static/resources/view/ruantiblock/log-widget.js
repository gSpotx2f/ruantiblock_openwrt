'use strict';
'require baseclass';
'require ui';
'require view.ruantiblock.log-base as base';

document.head.append(E('style', {'type': 'text/css'},
`
#logTable {
	width: calc(100% - 4px);
}
.log-entry-time-cell {
	min-width: 14em !important;
	white-space: pre-wrap !important;
}
.log-entry-host-cell {
	min-width: 10em !important;
	overflow-wrap: anywhere !important;
}
.log-entry-message-cell {
	min-width: 20em !important;
	white-space: pre-wrap !important;
	overflow-wrap: anywhere !important;
}
.log-entry-text-nowrap {
	white-space: nowrap !important;
};
`));

return baseclass.extend({
	view: base.view.extend({

		filterHighlightFunc(match) {
			return `<span class="log-highlight-item">${match}</span>`;
		},

		makeLogArea(logdataArray) {
			let lines    = `<tr class="tr"><td class="td center">${_('No entries available...')}</td></tr>`;
			let logTable = E('table', { 'id': 'logTable', 'class': 'table' });

			for(let level of Object.keys(this.logLevels)) {
				this.logLevelsStat[level] = 0;
			};

			if(logdataArray.length > 0) {
				lines = [];
				logdataArray.forEach((e, i) => {
					if(e[4] in this.logLevels) {
						this.logLevelsStat[e[4]] = this.logLevelsStat[e[4]] + 1;
					};

					let line = [ `<tr class="tr log-${(e[1]) ? e[4] || 'empty' : (this.entriesHandler) ? 'raw' : 'empty'}">` ];
					this.logCols.forEach((c, i) => {
						if(c) {
							let cellClass = '';
							switch(i) {
								case 0:
								case 3:
								case 4:
									cellClass = 'log-entry-text-nowrap';
									break;
								case 1:
									cellClass = 'log-entry-time-cell';
									break;
								case 2:
									cellClass = 'log-entry-host-cell';
									break;
								case 5:
									cellClass = 'log-entry-message-cell';
									break;
							};
							line.push(`<td class="td left ${cellClass}" data-title="${c}">${e[i] || '&#160;'}</td>`);
						};
					});
					line.push('</tr>');
					lines.push(line.join(''));
				});
				lines = lines.join('');

				let logTableHeader = E('tr', { 'class': 'tr table-titles' });
				this.logCols.forEach(e => {
					if(e) {
						logTableHeader.append(
							E('th', { 'class': 'th left log-entry-text-nowrap' }, e)
						);
					};
				});
				logTable.append(logTableHeader);
			};

			try {
				logTable.insertAdjacentHTML('beforeend', lines);
			} catch(err) {
				if(err.name == 'SyntaxError') {
					ui.addNotification(null,
						E('p', {}, _('HTML/XML error') + ': ' + err.message), 'error');
				};
				throw err;
			};

			let levelsStatString = '';
			if((Object.values(this.logLevelsStat).reduce((s,c) => s + c, 0)) > 0) {
				Object.entries(this.logLevelsStat).forEach(e => {
					if(e[0] in this.logLevels && e[1] > 0) {
						levelsStatString += `<span class="log-entries-count-level log-${e[0]}" title="${e[0]}">${e[1]}</span>`;
					};
				});
			};

			return E([
				E('div', { 'class': 'log-entries-count' },
					`${_('Entries')}: ${logdataArray.length} / ${this.totalLogLines}${levelsStatString}`
				),
				logTable,
			]);
		},
	}),
});
