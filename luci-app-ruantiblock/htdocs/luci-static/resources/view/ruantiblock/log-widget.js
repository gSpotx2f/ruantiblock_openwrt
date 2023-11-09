'use strict';
'require baseclass';
'require ui';
'require view.log.log-base as abc';

document.head.append(E('style', {'type': 'text/css'},
`
.log-entry-empty {
}
.log-entry-number {
	min-width: 4em !important;
}
.log-entry-time {
	min-width: 15em !important;
}
.log-entry-host {
	min-width: 10em !important;
}
.log-entry-host-cell {
	word-break: break-all !important;
	word-wrap: break-word !important;
}
.log-entry-log-level {
	max-width: 5em !important;
}
.log-entry-facility{
	max-width: 7em !important;
}
.log-entry-message {
	min-width: 25em !important;
}
.log-entry-message-cell {
	overflow-x: hidden !important;
	text-overflow: ellipsis !important;
}
`));

return baseclass.extend({
	view: abc.view.extend({

		regexpFilterHighlightFunc(match) {
			return `<span class="log-highlight-item">${match}</span>`;
		},

		makeLogArea(logdataArray) {
			let lines    = `<tr class="tr"><td class="td center log-entry-empty">${_('No entries available...')}</td></tr>`;
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

					lines.push(
						`<tr class="tr log-${e[4] || 'empty'}"><td class="td left" data-title="#">${e[0]}</td>` +
						((e[1]) ? `<td class="td left" data-title="${_('Timestamp')}">${e[1]}</td>` : '') +
						((e[2]) ? `<td class="td left log-entry-host-cell" data-title="${_('Host')}">${e[2]}</td>` : '') +
						((e[3]) ? `<td class="td left" data-title="${_('Facility')}">${e[3]}</td>` : '') +
						((e[4]) ? `<td class="td left" data-title="${_('Level')}">${e[4]}</td>` : '') +
						((e[5]) ? `<td class="td left log-entry-message-cell" data-title="${_('Message')}">${e[5]}</td>` : '') +
						'</tr>'
					);
				});
				lines = lines.join('');

				logTable.append(
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th left log-entry-number' }, '#'),
						(logdataArray[0][1]) ? E('th', { 'class': 'th left log-entry-time' }, _('Timestamp')) : '',
						(logdataArray[0][2]) ? E('th', { 'class': 'th left log-entry-host' }, _('Host')) : '',
						(logdataArray[0][3]) ? E('th', { 'class': 'th left log-entry-facility' }, _('Facility')) : '',
						(logdataArray[0][4]) ? E('th', { 'class': 'th left log-entry-log-level' }, _('Level')) : '',
						(logdataArray[0][5]) ? E('th', { 'class': 'th left log-entry-message' }, _('Message')) : '',
					])
				);
			};

			try {
				logTable.insertAdjacentHTML('beforeend', lines);
			} catch(err) {
				if(err.name === 'SyntaxError') {
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
