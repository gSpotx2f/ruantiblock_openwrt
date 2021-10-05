'use strict';
'require ui';

document.head.append(E('style', {'type': 'text/css'},
`
:root {
	--app-log-dark-font-color: #2e2e2e;
	--app-log-light-font-color: #fff;
	--app-log-debug-font-color: #737373;
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
	background-color: #a93734 !important;
	color: var(--app-log-light-font-color);
}
log-emerg .td {
	color: var(--app-log-light-font-color) !important;
}
log-emerg td {
	color: var(--app-log-light-font-color) !important;
}
.log-alert {
	background-color: #ff7968 !important;
	color: var(--app-log-light-font-color);
}
.log-alert .td {
	color: var(--app-log-light-font-color) !important;
}
.log-alert td {
	color: var(--app-log-light-font-color) !important;
}
.log-crit {
	background-color: #fcc3bf !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-crit .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-crit td {
	color: var(--app-log-dark-font-color) !important;
}
.log-err {
	background-color: #ffe9e8 !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-err .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-err td {
	color: var(--app-log-dark-font-color) !important;
}
.log-warn {
	background-color: #fff7e2 !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-warn .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-warn td {
	color: var(--app-log-dark-font-color) !important;
}
.log-notice {
	background-color: #e3ffec !important;
	color: var(--app-log-dark-font-color) !important;
}
.log-notice .td {
	color: var(--app-log-dark-font-color) !important;
}
.log-notice td {
	color: var(--app-log-dark-font-color) !important;
}
.log-info {
}
.log-debug {
	background-color: #ebf6ff !important;
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
`));

return L.Class.extend({
	view: L.view.extend({

		/**
		 * View name (for local storage and downloads).
		 * Must be overridden by a subclass!
		*/
		viewName: null,

		/**
		 * Page title.
		 * Must be overridden by a subclass!
		*/
		title: null,

		logLevels: {
			'emerg':	E('span', { 'class': 'zonebadge log-emerg' }, E('strong', _('Emergency'))),
			'alert':	E('span', { 'class': 'zonebadge log-alert' }, E('strong', _('Alert'))),
			'crit':		E('span', { 'class': 'zonebadge log-crit' }, E('strong', _('Critical'))),
			'err':		E('span', { 'class': 'zonebadge log-err' }, E('strong', _('Error'))),
			'warn':		E('span', { 'class': 'zonebadge log-warn' }, E('strong', _('Warning'))),
			'notice':	E('span', { 'class': 'zonebadge log-notice' }, E('strong', _('Notice'))),
			'info':		E('span', { 'class': 'zonebadge log-info' }, E('strong', _('Info'))),
			'debug':	E('span', { 'class': 'zonebadge log-debug' }, E('strong', _('Debug'))),
		},

		tailValue: 25,

		logSortingValue: 'asc',

		isHosts: false,

		isLevels: false,

		logHosts: {},

		logLevelsStat: {},

		logHostsDropdown: null,

		logLevelsDropdown: null,

		totalLogLines: 0,

		htmlEntities: function(str) {
			return String(str).replace(
				/&/g, '&#38;').replace(
				/</g, '&#60;').replace(
				/>/g, '&#62;').replace(
				/"/g, '&#34;').replace(
				/'/g, '&#39;');
		},

		makeLogHostsDropdownItem: function(host) {
			return E(
				'span',
				{ 'class': 'zonebadge log-host-dropdown-item' },
				E('strong', host)
			);
		},

		makeLogHostsDropdownSection: function() {
			this.logHostsDropdown = new ui.Dropdown(
				null,
				this.logHosts,
				{
					id: 'logHostsDropdown',
					multiple: true,
					select_placeholder: _('All'),
				}
			);
			return E(
				'div', { 'class': 'cbi-value' }, [
					E('label', {
						'class': 'cbi-value-title',
						'for': 'logHostsDropdown',
					}, _('Hosts')),
					E('div', { 'class': 'cbi-value-field' },
						this.logHostsDropdown.render()
					),
				]
			);
		},

		makeLogLevelsDropdownSection: function(){
			this.logLevelsDropdown = new ui.Dropdown(
				null,
				this.logLevels,
				{
					id: 'logLevelsDropdown',
					sort: Object.keys(this.logLevels),
					multiple: true,
					select_placeholder: _('All'),
				}
			);
			return E(
				'div', { 'class': 'cbi-value' }, [
					E('label', {
						'class': 'cbi-value-title',
						'for': 'logLevelsDropdown',
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
		getLogData: function(tail) {
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
		parseLogData: function(logdata, tail) {
			throw new Error('parseLogData must be overridden by a subclass');
		},

		setHostFilter: function(cArr) {
			let logHostsKeys = Object.keys(this.logHosts);
			if(logHostsKeys.length > 0 && this.logHostsDropdown) {
				let selectedHosts = this.logHostsDropdown.getValue();
				this.logHostsDropdown.addChoices(logHostsKeys, this.logHosts);
				if(selectedHosts.length === 0 || logHostsKeys.length === selectedHosts.length) {
					return cArr;
				};
				return cArr.filter(e => selectedHosts.includes(e[2]));
			};
			return cArr;
		},

		setLevelFilter: function(cArr) {
			let logLevelsKeys = Object.keys(this.logLevels);
			if(logLevelsKeys.length > 0 && this.logLevelsDropdown) {
				let selectedLevels = this.logLevelsDropdown.getValue();
				if(selectedLevels.length === 0 || logLevelsKeys.length === selectedLevels.length) {
					return cArr;
				};
				return cArr.filter(e => selectedLevels.includes(e[3]));
			};
			return cArr;
		},

		regexpFilterHighlightFunc: function(match) {
			return `<span class="log-highlight-item">${match}</span>`;
		},

		setRegexpFilter: function(cArr) {
			let fPattern = document.getElementById('logFilter').value;
			if(!fPattern) {
				return cArr;
			};
			let fArr = [];
			try {
				let regExp = new RegExp(fPattern, 'giu');
				cArr.forEach((e, i) => {
					if(e[5] !== null && regExp.test(e[5])) {
						if(this.regexpFilterHighlightFunc) {
							e[5] = e[5].replace(regExp, this.regexpFilterHighlightFunc);
						};
						fArr.push(e);
					};
					regExp.lastIndex = 0;
				});
			} catch(err) {
				if(err.name === 'SyntaxError') {
					ui.addNotification(null,
						E('p', {}, _('Invalid regular expression') + ': ' + err.message));
					return cArr;
				} else {
					throw err;
				};
			};
			return fArr;
		},

		makeLogArea: function(logdataArray) {
			let lines = `<div class="tr"><div class="td center log-entry-empty">${_('No entries available...')}</div></div>`;
			let logTable = E('div', { 'id': 'logTable', 'class': 'table' });

			for(let level of Object.keys(this.logLevels)) {
				this.logLevelsStat[level] = 0;
			};

			if(logdataArray.length > 0) {
				lines = [];
				logdataArray.forEach((e, i) => {
					if(e[3] in this.logLevels) {
						this.logLevelsStat[e[3]] = this.logLevelsStat[e[3]] + 1;
					};

					lines.push(
						`<div class="tr log-${e[3] || 'empty'}"><div class="td left" data-title="#">${e[0]}</div>` +
						((e[1]) ? `<div class="td left" data-title="${_('Timestamp')}">${e[1]}</div>` : '') +
						((e[2]) ? `<div class="td left log-entry-host-cell" data-title="${_('Host')}">${e[2]}</div>` : '') +
						((e[3]) ? `<div class="td left" data-title="${_('Level')}">${e[3]}</div>` : '') +
						((e[4]) ? `<div class="td left" data-title="${_('Facility')}">${e[4]}</div>` : '') +
						((e[5]) ? `<div class="td left log-entry-message-cell" data-title="${_('Message')}">${e[5]}</div>` : '') +
						`</div>`
					);
				});
				lines = lines.join('');

				logTable.append(
					E('div', { 'class': 'tr table-titles' }, [
						E('div', { 'class': 'th left log-entry-number' }, '#'),
						(logdataArray[0][1]) ? E('div', { 'class': 'th left log-entry-time' }, _('Timestamp')) : '',
						(logdataArray[0][2]) ? E('div', { 'class': 'th left log-entry-host' }, _('Host')) : '',
						(logdataArray[0][3]) ? E('div', { 'class': 'th left log-entry-log-level' }, _('Level')) : '',
						(logdataArray[0][4]) ? E('div', { 'class': 'th left log-entry-facility' }, _('Facility')) : '',
						(logdataArray[0][5]) ? E('div', { 'class': 'th left log-entry-message' }, _('Message')) : '',
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

		downloadLog: function(ev) {
			let formElems = Array.from(document.forms.logForm.elements);
			formElems.forEach(e => e.disabled = true);

			return this.getLogData(0).then(logdata => {
				logdata = logdata || '';
				let link = E('a', {
					'download': this.viewName + '.log',
					'href': URL.createObjectURL(
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

		load: function() {
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

		render: function(logdata) {
			let logWrapper = E('div', {
				'id': 'logWrapper',
				'style': 'width:100%; min-height:20em; padding: 0 0 0 45px; font-size:0.9em !important'
			}, this.makeLogArea(this.parseLogData(logdata, this.tailValue)));

			let tailInput = E('input', {
				'id': 'tailInput',
				'name': 'tailInput',
				'type': 'text',
				'form': 'logForm',
				'class': 'cbi-input-text',
				'style': 'width:4em !important; min-width:4em !important',
				'maxlength': 5,
			});
			tailInput.value = (this.tailValue === 0) ? null : this.tailValue;
			ui.addValidator(tailInput, 'uinteger', true);

			let tailReset = E('input', {
				'type': 'button',
				'form': 'logForm',
				'class': 'cbi-button btn cbi-button-reset',
				'value': 'Χ',
				'click': ev => {
					tailInput.value = null;
					logFormSubmitBtn.click();
					ev.target.blur();
				},
				'style': 'max-width:4em !important',
			});

			let logHostsDropdownElem = '';
			let logLevelsDropdownElem = '';
			if(this.isLevels) {
				logLevelsDropdownElem = this.makeLogLevelsDropdownSection();
			};
			if(this.isHosts) {
				logHostsDropdownElem = this.makeLogHostsDropdownSection();
			};

			let logFilter = E('input', {
				'id': 'logFilter',
				'name': 'logFilter',
				'type': 'text',
				'form': 'logForm',
				'class': 'cbi-input-text',
				'placeholder': _('Type an expression...'),
			});

			let logFormSubmitBtn = E('input', {
				'type': 'submit',
				'form': 'logForm',
				'class': 'cbi-button btn cbi-button-action',
				'value': _('Apply'),
				'click': ev => ev.target.blur(),
				'style': 'margin-right: 1em',
			});

			let logSorting = E('select', {
				'id': 'logSorting',
				'name': 'logSorting',
				'form': 'logForm',
				'class': "cbi-input-select",
			}, [
				E('option', { 'value': 'asc' }, _('ascending')),
				E('option', { 'value': 'desc' }, _('descending')),
			]);
			logSorting.value = this.logSortingValue;

			let logDownloadBtn = E('button', {
				'id': 'logDownloadBtn',
				'name': 'logDownloadBtn',
				'class': 'cbi-button btn',
				'click': ui.createHandlerFn(this, this.downloadLog),
			}, _('Download log'));

			return E([
				E('h2', { 'id': 'logTitle', 'class': 'fade-in' }, this.title),
				E('div', { 'class': 'cbi-section-descr fade-in' }),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, [

						E('div', { 'id': 'tailInputSection', 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for': 'tailInput',
							}, _('Last entries')),
							E('div', { 'class': 'cbi-value-field' }, [
								tailInput,
								tailReset,
							]),
						]),

						logHostsDropdownElem,
						logLevelsDropdownElem,

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for': 'logFilter',
							}, _('Message filter')),
							E('div', { 'class': 'cbi-value-field' }, logFilter),
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for': 'logSorting',
							}, _('Sorting entries')),
							E('div', { 'class': 'cbi-value-field' }, logSorting,),
						]),

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for': 'logFilter',
							}, _('Refresh log')),
							E('div', { 'class': 'cbi-value-field' }, [
								logFormSubmitBtn,
								E('form', {
									'id': 'logForm',
									'name': 'logForm',
									'style': 'display:inline-block; margin-top:0.5em',
									'submit': ui.createHandlerFn(this, function(ev) {
										ev.preventDefault();
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
													this.setRegexpFilter(
														this.setLevelFilter(
															this.setHostFilter(
																this.parseLogData(logdata, tail)
															)
														)
													)
												)
											);

											if(logdata) {
												let tailInputSection = document.getElementById('tailInputSection');
												if(this.isLevels && !this.logLevelsDropdown) {
													tailInputSection.after(this.makeLogLevelsDropdownSection());
												};
												if(this.isHosts && !this.logHostsDropdown) {
													tailInputSection.after(this.makeLogHostsDropdownSection());
												};
											};
										}).finally(() => {
											formElems.forEach(e => e.disabled = false);
											logDownloadBtn.disabled = false;
										});
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
		handleSave: null,
		handleReset: null,
	}),
})
