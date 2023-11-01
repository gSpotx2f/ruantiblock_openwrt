'use strict';
'require baseclass';
'require ui';
'require view';

document.head.append(E('style', {'type': 'text/css'},
`
:root {
	--app-log-dark-font-color: #2e2e2e;
	--app-log-light-font-color: #fff;
	--app-log-debug-font-color: #737373;
	--app-log-emerg-color: #a93734;
	--app-log-alert: #ff7968;
	--app-log-crit: #fcc3bf;
	--app-log-err: #ffe9e8;
	--app-log-warn: #fff7e2;
	--app-log-notice: #e3ffec;
	--app-log-info: rgba(0,0,0,0);
	--app-log-debug: #ebf6ff;
}
:root[data-darkmode="true"] {
	--app-log-dark-font-color: #fff;
	--app-log-light-font-color: #fff;
	--app-log-debug-font-color: #e7e7e7;
	--app-log-emerg-color: #a93734;
	--app-log-alert: #eb5050;
	--app-log-crit: #dc7f79;
	--app-log-err: #c89593;
	--app-log-warn: #8d7000;
	--app-log-notice: #007627;
	--app-log-info: rgba(0,0,0,0);
	--app-log-debug: #5986b1;
}
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
.log-empty {
}
.log-emerg {
	background-color: var(--app-log-emerg-color) !important;
	color: var(--app-log-light-font-color);
}
log-emerg .td {
	color: var(--app-log-light-font-color) !important;
}
log-emerg td {
	color: var(--app-log-light-font-color) !important;
}
.log-alert {
	background-color: var(--app-log-alert) !important;
	color: var(--app-log-light-font-color);
}
.log-alert .td {
	color: var(--app-log-light-font-color) !important;
}
.log-alert td {
	color: var(--app-log-light-font-color) !important;
}
.log-crit {
	background-color: var(--app-log-crit) !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-crit .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-crit td {
	color: var(--app-log-dark-font-color) !important;
}
.log-err {
	background-color: var(--app-log-err) !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-err .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-err td {
	color: var(--app-log-dark-font-color) !important;
}
.log-warn {
	background-color: var(--app-log-warn) !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-warn .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-warn td {
	color: var(--app-log-dark-font-color) !important;
}
.log-notice {
	background-color: var(--app-log-notice) !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-notice .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-notice td {
	color: var(--app-log-dark-font-color) !important;
}
.log-info {
	background-color: var(--app-log-info) !important;
}
.log-debug {
	background-color: var(--app-log-debug) !important;
	color: var(--app-log-debug-font-color) !important;
}
.log-debug .td {
	color: var(--app-log-debug-font-color) !important;
}
.log-debug td {
	color: var(--app-log-debug-font-color) !important;
}
.log-highlight-item {
	background-color: #ffef00;
	color: #2e2e2e;
}
.log-entries-count {
	margin: 0 0 5px 5px;
	font-weight: bold;
	opacity: 0.7;
}
.log-entries-count-level {
	display: inline-block !important;
	margin: 0 0 0 5px;
	padding: 0 4px;
	-webkit-border-radius: 3px;
	-moz-border-radius: 3px;
	border-radius: 3px;
	border: 1px solid #ccc;
	font-weight: normal;
}
.log-host-dropdown-item {
}
.log-facility-dropdown-item {
}
`));

return baseclass.extend({
	view: view.extend({
		/**
		 * View name (for local storage and downloads).
		 * Must be overridden by a subclass!
		*/
		viewName         : null,

		/**
		 * Page title.
		 * Must be overridden by a subclass!
		*/
		title            : null,

		logFacilities    : {
			'kern'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'kern')),
			'user'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'user')),
			'mail'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'mail')),
			'daemon'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'daemon')),
			'auth'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'auth')),
			'syslog'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'syslog')),
			'lpr'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'lpr')),
			'news'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'news')),
			'uucp'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'uucp')),
			'authpriv': E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'authpriv')),
			'ftp'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'ftp')),
			'ntp'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'ntp')),
			'log'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'log')),
			'clock'   : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'clock')),
			'local0'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local0')),
			'local1'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local1')),
			'local2'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local2')),
			'local3'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local3')),
			'local4'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local4')),
			'local5'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local5')),
			'local6'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local6')),
			'local7'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'local7')),
		},

		logLevels        : {
			'emerg' : E('span', { 'class': 'zonebadge log-emerg' }, E('strong', _('Emergency'))),
			'alert' : E('span', { 'class': 'zonebadge log-alert' }, E('strong', _('Alert'))),
			'crit'  : E('span', { 'class': 'zonebadge log-crit' }, E('strong', _('Critical'))),
			'err'   : E('span', { 'class': 'zonebadge log-err' }, E('strong', _('Error'))),
			'warn'  : E('span', { 'class': 'zonebadge log-warn' }, E('strong', _('Warning'))),
			'notice': E('span', { 'class': 'zonebadge log-notice' }, E('strong', _('Notice'))),
			'info'  : E('span', { 'class': 'zonebadge log-info' }, E('strong', _('Info'))),
			'debug' : E('span', { 'class': 'zonebadge log-debug' }, E('strong', _('Debug'))),
		},

		tailValue            : 25,

		logSortingValue      : 'asc',

		isHosts              : false,

		isFacilities         : false,

		isLevels             : false,

		logHosts             : {},

		logLevelsStat        : {},

		logHostsDropdown     : null,

		logFacilitiesDropdown: null,

		logLevelsDropdown    : null,

		totalLogLines        : 0,

		htmlEntities(str) {
			return String(str).replace(
				/&/g, '&#38;').replace(
				/</g, '&#60;').replace(
				/>/g, '&#62;').replace(
				/"/g, '&#34;').replace(
				/'/g, '&#39;');
		},

		makeLogHostsDropdownItem(host) {
			return E(
				'span',
				{ 'class': 'zonebadge log-host-dropdown-item' },
				E('strong', host)
			);
		},

		makeLogHostsDropdownSection() {
			this.logHostsDropdown = new ui.Dropdown(
				null,
				this.logHosts,
				{
					id                : 'logHostsDropdown',
					multiple          : true,
					select_placeholder: _('All'),
				}
			);
			return E(
				'div', { 'class': 'cbi-value' }, [
					E('label', {
						'class': 'cbi-value-title',
						'for'  : 'logHostsDropdown',
					}, _('Hosts')),
					E('div', { 'class': 'cbi-value-field' },
						this.logHostsDropdown.render()
					),
				]
			);
		},

		makeLogFacilitiesDropdownSection(){
			this.logFacilitiesDropdown = new ui.Dropdown(
				null,
				this.logFacilities,
				{
					id                : 'logFacilitiesDropdown',
					sort              : Object.keys(this.logFacilities),
					multiple          : true,
					select_placeholder: _('All'),
				}
			);
			return E(
				'div', { 'class': 'cbi-value' }, [
					E('label', {
						'class': 'cbi-value-title',
						'for'  : 'logFacilitiesDropdown',
					}, _('Facilities')),
					E('div', { 'class': 'cbi-value-field' },
						this.logFacilitiesDropdown.render()
					),
				]
			);
		},

		makeLogLevelsDropdownSection(){
			this.logLevelsDropdown = new ui.Dropdown(
				null,
				this.logLevels,
				{
					id                : 'logLevelsDropdown',
					sort              : Object.keys(this.logLevels),
					multiple          : true,
					select_placeholder: _('All'),
				}
			);
			return E(
				'div', { 'class': 'cbi-value' }, [
					E('label', {
						'class': 'cbi-value-title',
						'for'  : 'logLevelsDropdown',
					}, _('Logging levels')),
					E('div', { 'class': 'cbi-value-field' },
						this.logLevelsDropdown.render()
					),
				]
			);
		},

		/**
		* Receives raw log data.
		* Abstract method, must be overridden by a subclass!
		*
		* @param {number} tail
		* @returns {string}
		* Returns the raw content of the log
		*/
		getLogData(tail) {
			throw new Error('getLogData must be overridden by a subclass');
		},

		/**
		* Parses log data.
		* Abstract method, must be overridden by a subclass!
		*
		* @param {string} logdata
		* @param {number} tail
		* @returns {Array<number, string|null, string|null, string|null, string|null, string|null>}
		* Returns an array of values: [ #, Timestamp, Host, Level, Facility, Message ]
		*/
		parseLogData(logdata, tail) {
			throw new Error('parseLogData must be overridden by a subclass');
		},

		setDateFilter(entriesArray) {
			let fPattern = document.getElementById('timeFilter').value;
			if(!fPattern) {
				return entriesArray;
			};
			return this.setRegexpFilter(entriesArray, 1, fPattern);
		},

		setHostFilter(entriesArray) {
			let logHostsKeys = Object.keys(this.logHosts);
			if(logHostsKeys.length > 0 && this.logHostsDropdown) {
				let selectedHosts = this.logHostsDropdown.getValue();
				this.logHostsDropdown.addChoices(logHostsKeys, this.logHosts);
				if(selectedHosts.length === 0 || logHostsKeys.length === selectedHosts.length) {
					return entriesArray;
				};
				return entriesArray.filter(e => selectedHosts.includes(e[2]));
			};
			return entriesArray;
		},

		setFacilityFilter(entriesArray) {
			let logFacilitiesKeys = Object.keys(this.logFacilities);
			if(logFacilitiesKeys.length > 0 && this.logFacilitiesDropdown) {
				let selectedFacilities = this.logFacilitiesDropdown.getValue();
				if(selectedFacilities.length === 0 || logFacilitiesKeys.length === selectedFacilities.length) {
					return entriesArray;
				};
				return entriesArray.filter(e => selectedFacilities.includes(e[3]));
			};
			return entriesArray;
		},

		setLevelFilter(entriesArray) {
			let logLevelsKeys = Object.keys(this.logLevels);
			if(logLevelsKeys.length > 0 && this.logLevelsDropdown) {
				let selectedLevels = this.logLevelsDropdown.getValue();
				if(selectedLevels.length === 0 || logLevelsKeys.length === selectedLevels.length) {
					return entriesArray;
				};
				return entriesArray.filter(e => selectedLevels.includes(e[4]));
			};
			return entriesArray;
		},

		regexpFilterHighlightFunc(match) {
			return `<span class="log-highlight-item">${match}</span>`;
		},

		setRegexpFilter(entriesArray, fieldNum, pattern) {
			let fArr = [];
			try {
				let regExp = new RegExp(pattern, 'giu');
				entriesArray.forEach((e, i) => {
					if(e[fieldNum] !== null && regExp.test(e[fieldNum])) {
						if(this.regexpFilterHighlightFunc) {
							e[fieldNum] = e[fieldNum].replace(regExp, this.regexpFilterHighlightFunc);
						};
						fArr.push(e);
					};
					regExp.lastIndex = 0;
				});
			} catch(err) {
				if(err.name === 'SyntaxError') {
					ui.addNotification(null,
						E('p', {}, _('Invalid regular expression') + ': ' + err.message));
					return entriesArray;
				} else {
					throw err;
				};
			};
			return fArr;
		},

		setMsgFilter(entriesArray) {
			let fPattern = document.getElementById('msgFilter').value;
			if(!fPattern) {
				return entriesArray;
			};
			return this.setRegexpFilter(entriesArray, 5, fPattern);
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
						((e[1]) ? `<td class="td left" data-title="${_('Timestamp')}"><span class="log-timestamp">${e[1]}</span></td>` : '') +
						((e[2]) ? `<td class="td left log-entry-host-cell" data-title="${_('Host')}">${e[2]}</td>` : '') +
						((e[3]) ? `<td class="td left" data-title="${_('Facility')}">${e[3]}</td>` : '') +
						((e[4]) ? `<td class="td left" data-title="${_('Level')}">${e[4]}</td>` : '') +
						((e[5]) ? `<td class="td left log-entry-message-cell" data-title="${_('Message')}">${e[5]}</td>` : '') +
						`</tr>`
					);
				});
				lines = lines.join('');

				logTable.append(
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th left log-entry-number' }, '#'),
						(logdataArray[0][1]) ? E('th', { 'class': 'th left log-entry-time' }, _('Timestamp')) : '',
						(logdataArray[0][2]) ? E('th', { 'class': 'th left log-entry-host' }, _('Host')) : '',
						(logdataArray[0][4]) ? E('th', { 'class': 'th left log-entry-facility' }, _('Facility')) : '',
						(logdataArray[0][3]) ? E('th', { 'class': 'th left log-entry-log-level' }, _('Level')) : '',
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

		downloadLog(ev) {
			let formElems = Array.from(document.forms.logForm.elements);
			formElems.forEach(e => e.disabled = true);

			return this.getLogData(0).then(logdata => {
				logdata = logdata || '';
				let link = E('a', {
					'download': this.viewName + '.log',
					'href'    : URL.createObjectURL(
						new Blob([ logdata ], { type: 'text/plain' })),
				});
				link.click();
				URL.revokeObjectURL(link.href);
			}).catch(() => {
				ui.addNotification(null,
					E('p', {}, _('Download error') + ': ' + err.message));
			}).finally(() => {
				formElems.forEach(e => e.disabled = false);
			});
		},

		load() {
			// Restoring settings from localStorage
			let tailValueLocal = localStorage.getItem(`luci-app-${this.viewName}-tailValue`);
			if(tailValueLocal) {
				this.tailValue = Number(tailValueLocal);
			};
			let logSortingLocal = localStorage.getItem(`luci-app-${this.viewName}-logSorting`);
			if(logSortingLocal) {
				this.logSortingValue = logSortingLocal;
			};
			return this.getLogData(this.tailValue);
		},

		render(logdata) {
			let logWrapper = E('div', {
				'id'   : 'logWrapper',
				'style': 'width:100%; min-height:20em; padding: 0 0 0 45px; font-size:0.9em !important'
			}, this.makeLogArea(this.parseLogData(logdata, this.tailValue)));

			let tailInput = E('input', {
				'id'       : 'tailInput',
				'name'     : 'tailInput',
				'type'     : 'text',
				'form'     : 'logForm',
				'class'    : 'cbi-input-text',
				'style'    : 'width:4em !important; min-width:4em !important',
				'maxlength': 5,
			});
			tailInput.value = (this.tailValue === 0) ? null : this.tailValue;
			ui.addValidator(tailInput, 'uinteger', true);

			let tailReset = E('input', {
				'type' : 'button',
				'form' : 'logForm',
				'class': 'cbi-button btn',
				'value': '×',
				'click': ev => {
					tailInput.value = null;
					logFormSubmitBtn.click();
					ev.target.blur();
				},
				'style': 'max-width:4em !important',
			});

			let logHostsDropdownElem      = '';
			let logFacilitiesDropdownElem = '';
			let logLevelsDropdownElem     = '';
			if(this.isLevels) {
				logLevelsDropdownElem = this.makeLogLevelsDropdownSection();
			};
			if(this.isFacilities) {
				logFacilitiesDropdownElem = this.makeLogFacilitiesDropdownSection();
			};
			if(this.isHosts) {
				logHostsDropdownElem = this.makeLogHostsDropdownSection();
			};

			let timeFilter = E('input', {
				'id'         : 'timeFilter',
				'name'       : 'timeFilter',
				'type'       : 'text',
				'form'       : 'logForm',
				'class'      : 'cbi-input-text',
				'placeholder': _('Type an expression...'),
			});

			let msgFilter = E('input', {
				'id'         : 'msgFilter',
				'name'       : 'msgFilter',
				'type'       : 'text',
				'form'       : 'logForm',
				'class'      : 'cbi-input-text',
				'placeholder': _('Type an expression...'),
			});

			let logFormSubmitBtn = E('input', {
				'type' : 'submit',
				'form' : 'logForm',
				'class': 'cbi-button btn cbi-button-action',
				'value': _('Apply'),
				'click': ev => ev.target.blur(),
				'style': 'margin-right: 1em',
			});

			let logSorting = E('select', {
				'id'   : 'logSorting',
				'name' : 'logSorting',
				'form' : 'logForm',
				'class': "cbi-input-select",
			}, [
				E('option', { 'value': 'asc' }, _('ascending')),
				E('option', { 'value': 'desc' }, _('descending')),
			]);
			logSorting.value = this.logSortingValue;

			let logDownloadBtn = E('button', {
				'id'   : 'logDownloadBtn',
				'name' : 'logDownloadBtn',
				'class': 'cbi-button btn',
				'click': ui.createHandlerFn(this, this.downloadLog),
			}, _('Download log'));

			let onSubmitForm = () => {
				let formElems = Array.from(document.forms.logForm.elements);
				formElems.forEach(e => e.disabled = true);
				logDownloadBtn.disabled = true;

				// Saving settings to localStorage
				if(this.tailValue != tailInput.value) {
					this.tailValue = (/^[0-9]+$/.test(tailInput.value)) ? tailInput.value : 0;
					localStorage.setItem(
						`luci-app-${this.viewName}-tailValue`, String(this.tailValue));
				};
				if(this.logSortingValue != logSorting.value) {
					this.logSortingValue = logSorting.value;
					localStorage.setItem(
						`luci-app-${this.viewName}-logSorting`, this.logSortingValue);
				};

				let tail = (tailInput.value && tailInput.value > 0) ? tailInput.value : 0
				return this.getLogData(tail).then(logdata => {
					logdata = logdata || '';
					logWrapper.innerHTML = '';
					logWrapper.append(
						this.makeLogArea(
							this.setMsgFilter(
								this.setFacilityFilter(
									this.setLevelFilter(
										this.setHostFilter(
											this.setDateFilter(
												this.parseLogData(logdata, tail)
											)
										)
									)
								)
							)
						)
					);

					if(logdata) {
						let timeFilterSection = document.getElementById('timeFilterSection');
						if(this.isFacilities && !this.logFacilitiesDropdown) {
							logFacilitiesDropdownElem = this.makeLogFacilitiesDropdownSection();
						};
						if(this.isLevels && !this.logLevelsDropdown) {
							timeFilterSection.after(this.makeLogLevelsDropdownSection());
						};
						if(this.isHosts && !this.logHostsDropdown) {
							timeFilterSection.after(this.makeLogHostsDropdownSection());
						};
					};
				}).finally(() => {
					formElems.forEach(e => e.disabled = false);
					logDownloadBtn.disabled = false;
				});
			};

			return E([
				E('h2', { 'id': 'logTitle', 'class': 'fade-in' }, this.title),
				E('div', { 'class': 'cbi-section-descr fade-in' }),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, [

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for'  : 'tailInput',
							}, _('Last entries')),
							E('div', { 'class': 'cbi-value-field' }, [
								tailInput,
								tailReset,
							]),
						]),

						E('div', { 'id': 'timeFilterSection', 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for'  : 'timeFilter',
							}, _('Timestamp filter')),
							E('div', { 'class': 'cbi-value-field' }, timeFilter),
						]),

						logHostsDropdownElem,
						logFacilitiesDropdownElem,
						logLevelsDropdownElem,

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for'  : 'msgFilter',
							}, _('Message filter')),
							E('div', { 'class': 'cbi-value-field' }, msgFilter),
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for'  : 'logSorting',
							}, _('Sorting entries')),
							E('div', { 'class': 'cbi-value-field' }, logSorting,),
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for'  : 'logFormSubmitBtn',
							}, _('Refresh log')),
							E('div', { 'class': 'cbi-value-field' }, [
								logFormSubmitBtn,
								E('input', {
									'id'  : 'logFormSubmitBtn',
									'type': 'hidden',
								}),
								E('form', {
									'id'    : 'logForm',
									'name'  : 'logForm',
									'style' : 'display:inline-block; margin-top:0.5em',
									'submit': ui.createHandlerFn(this, function(ev) {
										ev.preventDefault();
										return onSubmitForm();
									}),
								}, E('span', {}, '&#160;')),
							]),
						]),
					])
				),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, [
						E('div', { 'style': 'position:fixed; z-index:1 !important' }, [
							E('button', {
								'class': 'btn',
								'style': 'position:relative; display:block; margin:0 !important; left:1px; top:1px',
								'click': ev => {
									document.getElementById('logTitle').scrollIntoView(true);
									ev.target.blur();
								},
							}, '&#8593;'),
							E('button', {
								'class': 'btn',
								'style': 'position:relative; display:block; margin:0 !important; margin-top:1px !important; left:1px; top:1px',
								'click': ev => {
									logWrapper.scrollIntoView(false);
									ev.target.blur();
								},
							}, '&#8595;'),
						]),
						logWrapper,
					])
				),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' },
						E('div', { 'class': 'cbi-value' },
							E('div', { 'style': 'width:100%; text-align:right !important' }, logDownloadBtn)
						),
					)
				),
			]);
		},

		handleSaveApply: null,
		handleSave     : null,
		handleReset    : null,
	}),
})
