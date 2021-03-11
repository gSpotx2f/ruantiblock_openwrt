'use strict';
'require ui';

return L.Class.extend({
	view: L.view.extend({
		viewName: null,

		title: null,

		logFacilities: [
			'kern',
			'user',
			'mail',
			'daemon',
			'auth',
			'syslog',
			'lpr',
			'news',
		],

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

		logLevelsStat: {},

		logLevelsDropdown: null,

		totalLogLines: 0,

		htmlEntities: function(str) {
			return String(str).replace(
				/&/g, '&#38;').replace(
				/</g, '&#60;').replace(
				/>/g, '&#62;').replace(
				/"/g, '&#34;');
		},

		/**
		*
		* @param {number} tail
		* @returns {string}
		* Returns the raw content of the log
		*
		*/
		getLogData: function(tail) {
			throw new Error('getLogData needs to be reloaded in subclass');
		},

		/**
		*
		* @param {string} logdata
		* @param {number} tail
		* @returns {Array<number, string|null, string|null, string|null, string|null>}
		* Returns an array of values: [ #, Timestamp, Level, Facility, Message ]
		*
		*/
		parseLogData: function(logdata, tail) {
			throw new Error('parseLogData needs to be reloaded in subclass');
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
					this.logLevelsStat[e[2]] = (this.logLevelsStat[e[2]] != undefined) ?
							this.logLevelsStat[e[2]] + 1 : 1;

					lines.push(
						`<div class="tr log-${e[2] || 'empty'}"><div class="td left" data-title="#">${e[0]}</div>` +
						((e[1]) ? `<div class="td left" data-title="${_('Timestamp')}">${e[1]}</div>` : '') +
						((e[2]) ? `<div class="td left" data-title="${_('Level')}">${e[2]}</div>` : '') +
						((e[3]) ? `<div class="td left" data-title="${_('Facility')}">${e[3]}</div>` : '') +
						((e[4]) ? `<div class="td left" data-title="${_('Message')}">${e[4]}</div>` : '') +
						`</div>`
					);
				});
				lines = lines.join('');

				logTable.append(
					E('div', { 'class': 'tr table-titles' }, [
						E('div', { 'class': 'th left log-entry-number' }, '#'),
						(logdataArray[0][1]) ? E('div', { 'class': 'th left log-entry-time' }, _('Timestamp')) : '',
						(logdataArray[0][2]) ? E('div', { 'class': 'th left log-entry-log-level' }, _('Level')) : '',
						(logdataArray[0][3]) ? E('div', { 'class': 'th left log-entry-facility' }, _('Facility')) : '',
						(logdataArray[0][4]) ? E('div', { 'class': 'th left log-entry-message' }, _('Message')) : '',
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
					if(e[1] > 0) {
						levelsStatString += `<span class="log-entries-count-level log-${e[0]}" title="${e[0]}">${e[1]}</span>`;
					};
				});
			};

			return E([
				E('div', { 'class': 'log-entries-count' },
					`${_('Entries')}: ${logdataArray.length} / ${this.totalLogLines}${levelsStatString}`
				),
				logTable
			]);
		},

		setLevelFilter: function(cArr) {
			let logLevelsKeys = Object.keys(this.logLevels);
			if(logLevelsKeys.length > 0) {
				let selectedLevels = this.logLevelsDropdown.getValue();
				if(logLevelsKeys.length === selectedLevels.length) {
					return cArr;
				};
				return cArr.filter(s => selectedLevels.length === 0 || selectedLevels.includes(s[2]));
			};
			return cArr;
		},

		setRegexpFilter: function(cArr) {
			let fPattern = document.getElementById('logFilter').value;
			if(!fPattern) {
				return cArr;
			};
			let fArr = [];
			try {
				let regExp = new RegExp(`(${fPattern})`, 'giu');
				cArr.forEach((e, i) => {
					if(regExp.test(e[4])) {
						e[4] = e[4].replace(regExp, '<span class="log-highlight-item">$1</span>');
						fArr.push(e);
					};
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

		downloadLog: function() {
			let formElems = Array.from(document.forms.logForm.elements);
			formElems.forEach(e => e.disabled = true);

			return this.getLogData(0).then(logdata => {
				logdata = logdata || '';
				let link = E('a', {
					'download': this.viewName + '.txt',
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

			document.head.append(E('style', {'type': 'text/css'},
`
.log-entry-empty {
}
.log-entry-number {
	min-width: 4em !important;
}
.log-entry-time {
	min-width: 14em !important;
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
.log-empty {
}
.log-emerg {
	background-color: #a93734 !important;
	color: #fff;
}
.log-alert {
	background-color: #ff7968 !important;
	color: #fff;
}
.log-crit {
	background-color: #fcc3bf !important;
}
.log-err {
	background-color: #ffe9e8 !important;
}
.log-warn {
	background-color: #fff7e2 !important;
}
.log-notice {
	background-color: #e3ffec !important;
}
.log-info {
}
.log-debug {
	background-color: #ebf6ff !important;
}
.log-highlight-item {
	background-color: #ffef00;
}
.log-entries-count {
	margin: 0 0 5px 5px;
	font-weight: bold;
	opacity: 0.6;
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
`
			));

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

			let logLevelsDropdownElem = '';
			let logLevelsKeys = Object.keys(this.logLevels);
			if(logLevelsKeys.length > 0) {
				this.logLevelsDropdown = new ui.Dropdown(
					null,
					this.logLevels,
					{
						id: 'logLevelsDropdown',
						sort: logLevelsKeys,
						multiple: true,
						select_placeholder: _('All'),
						display_items: 3,
						dropdown_items: -1,
					}
				);
				logLevelsDropdownElem = E(
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
				'form': 'logForm',
				'class': "cbi-input-select",
			}, [
				E('option', { 'value': 'asc' }, _('ascending')),
				E('option', { 'value': 'desc' }, _('descending')),
			]);
			logSorting.value = this.logSortingValue;

			let logDownloadBtn = E('button', {
				'class': 'cbi-button btn',
				'click': ui.createHandlerFn(this, this.downloadLog),
			}, _('Download log'));

			return E([
				E('h2', { 'id': 'logTitle', 'class': 'fade-in' }, this.title),
				E('div', { 'class': 'cbi-section-descr fade-in' }),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, [

						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for': 'tailInput',
							}, _('Last entries')),
							E('div', { 'class': 'cbi-value-field' }, [
								tailInput,
								tailReset,
							]),
						]),

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
							}),
							E('div', { 'class': 'cbi-value-field' }, [
								logFormSubmitBtn,
								E('form', {
									'id': 'logForm',
									'name': 'logForm',
									'style': 'display:inline-block',
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

											let loglines = this.makeLogArea(
												this.setRegexpFilter(
													this.setLevelFilter(
														this.parseLogData(logdata, tail)
													)
												)
											);

											logWrapper.innerHTML = '';
											logWrapper.append(loglines);

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
					E('div', { 'class': 'cbi-section-node' },
						E('div', { 'class': 'cbi-value' }, [
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
					)
				),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' },
						E('div', { 'class': 'cbi-value' },
							E('div', { 'style': 'width:100%; text-align:right !important' }, [
								E('hr'),
								logDownloadBtn,
							])
						)
					)
				),
			]);
		},

		handleSaveApply: null,
		handleSave: null,
		handleReset: null,
	}),
})
