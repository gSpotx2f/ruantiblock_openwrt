'use strict';
'require poll';
'require baseclass';
'require ui';
'require view';

document.head.append(E('style', {'type': 'text/css'},
`
:root {
	--app-log-dark-font-color: #2e2e2e;
	--app-log-light-font-color: #fff;
	--app-log-debug-font-color: #737373;
	--app-log-raw-font-color: #737373;
	--app-log-emerg-color: #a93734;
	--app-log-alert: #ff7968;
	--app-log-crit: #fcc3bf;
	--app-log-err: #ffe9e8;
	--app-log-warn: #fff7e2;
	--app-log-notice: #e3ffec;
	--app-log-info: rgba(0,0,0,0);
	--app-log-debug: #ebf6ff;
	--app-log-raw: #eee;
	--app-log-entries-count-border: #ccc;
}
:root[data-darkmode="true"] {
	--app-log-dark-font-color: #fff;
	--app-log-light-font-color: #fff;
	--app-log-debug-font-color: #e7e7e7;
	--app-log-raw-font-color: #aaa;
	--app-log-emerg-color: #960909;
	--app-log-alert: #eb5050;
	--app-log-crit: #dc7f79;
	--app-log-err: #9a5954;
	--app-log-warn: #8d7000;
	--app-log-notice: #007627;
	--app-log-info: rgba(0,0,0,0);
	--app-log-debug: #5986b1;
	--app-log-raw: #353535;
	--app-log-entries-count-border: #555;
}
#logWrapper {
	overflow: auto !important;
	width: 100%;
	min-height: 20em';
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
	/*color: var(--app-log-dark-font-color) !important;*/
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
.log-raw {
	background-color: var(--app-log-raw) !important;
	color: var(--app-log-raw-font-color) !important;
}
.log-raw .td {
	color: var(--app-log-raw-font-color) !important;
}
.log-raw td {
	color: var(--app-log-raw-font-color) !important;
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
	border: 1px solid var(--app-log-entries-count-border);
	font-weight: normal;
}
.log-host-dropdown-item {
}
.log-facility-dropdown-item {
}
#moreEntriesBar {
	opacity: 0.7;
}
#moreEntriesBar > button {
	margin: 1em 0 1em 0 !important;
	min-width: 100%;
}
.log-side-block {
	position: fixed;
	z-index: 200 !important;
	opacity: 0.7;
	right: 1px;
	top: 40vh;
}
.log-side-btn {
	position: relative;
	display: block;
	left: 1px;
	top: 1px;
	margin: 0 !important;
	min-width: 3.2em;
}
`));

return baseclass.extend({
	view: view.extend({
		/**
		 * View name (for local storage and downloads).
		 *
		 * @property {string} viewName
		 */
		viewName             : null,

		/**
		 * Page title.
		 *
		 * @property {string} title
		 */
		title                : null,

		/**
		 * Enable auto refresh log.
		 *
		 * @property {bool} enableAutoRefresh
		 */
		enableAutoRefresh    : false,

		/**
		 * Enable timestamp conversion.
		 *
		 * @property {bool} enableConvertTimestamp
		 */
		enableConvertTimestamp: false,

		pollInterval         : L.env.pollinterval,

		logFacilities        : {
			'kern'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'kern')),
			'user'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'user')),
			'mail'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'mail')),
			'daemon'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'daemon')),
			'auth'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'auth')),
			'syslog'  : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'syslog')),
			'lpr'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'lpr')),
			'news'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'news')),
			'uucp'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'uucp')),
			'cron'    : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'cron')),
			'authpriv': E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'authpriv')),
			'ftp'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'ftp')),
			'ntp'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'ntp')),
			'log'     : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'log')),
			'security': E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'security')),
			'console' : E('span', { 'class': 'zonebadge log-facility-dropdown-item' }, E('strong', 'console')),
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

		logLevels            : {
			'emerg' : E('span', { 'class': 'zonebadge log-emerg' }, E('strong', 'Emergency')),
			'alert' : E('span', { 'class': 'zonebadge log-alert' }, E('strong', 'Alert')),
			'crit'  : E('span', { 'class': 'zonebadge log-crit' }, E('strong', 'Critical')),
			'err'   : E('span', { 'class': 'zonebadge log-err' }, E('strong', 'Error')),
			'warn'  : E('span', { 'class': 'zonebadge log-warn' }, E('strong', 'Warning')),
			'notice': E('span', { 'class': 'zonebadge log-notice' }, E('strong', 'Notice')),
			'info'  : E('span', { 'class': 'zonebadge log-info' }, E('strong', 'Info')),
			'debug' : E('span', { 'class': 'zonebadge log-debug' }, E('strong', 'Debug')),
		},

		tailValue            : 25,

		fastTailIncrement    : 50,

		fastTailValue        : null,

		timeFilterValue      : null,

		timeFilterReValue    : false,

		hostFilterValue      : null,

		hostFilterReValue    : false,

		facilityFilterValue  : [],

		levelFilterValue     : [],

		msgFilterValue       : null,

		msgFilterReValue     : false,

		logSortingValue      : 'asc',

		autoRefreshValue     : true,

		autorefreshOn        : true,

		logTimestampFlag     : false,

		logHostFlag          : false,

		logFacilitiesFlag    : false,

		logLevelsFlag        : false,

		logLevelsStat        : {},

		logFacilitiesDropdown: null,

		logLevelsDropdown    : null,

		totalLogLines        : 0,

		logCols              : [ '#', null, null, null, null, _('Message') ],

		convertTimestampValue: false,

		convertTimestampOn   : false,

		lastHash             : null,

		actionButtons        : [],

		htmlEntities(str) {
			return String(str).replace(
				/&/g, '&#38;').replace(
				/</g, '&#60;').replace(
				/>/g, '&#62;').replace(
				/"/g, '&#34;').replace(
				/'/g, '&#39;');
		},

		checkZeroValue(value) {
			return (/^[0-9]+$/.test(value)) ? value : 0
		},

		makeRegExpButton(filterEl, checked) {
			const btnOnClass  = 'cbi-button-positive btn important',
			      btnOnStyle  = 'text-decoration:none',
			      btnOffClass = 'cbi-button-neutral btn',
			      btnOffStyle = 'text-decoration:line-through';
			let btn = E('button', {
				'class': checked ? btnOnClass : btnOffClass,
				'style': checked ? btnOnStyle : btnOffStyle,
				'title': _('Apply pattern as regular expression'),
				'click': ev => {
					ev.target.toggle();
					filterEl.focus();
					ev.preventDefault();
				},
			}, 'RE');
			btn._state  = checked;
			btn._on     = function() {
				this._state    = true;
				this.className = btnOnClass;
				this.style     = btnOnStyle;
			};
			btn._off    = function() {
				this._state    = false;
				this.className = btnOffClass;
				this.style     = btnOffStyle;
			};
			btn.checked = function() {
				return this._state;
			};
			btn.toggle  = function() {
				this._state ? this._off() : this._on();
			};
			btn.set     = function(flag) {
				flag ? this._on() : this._off();
			};
			return btn;
		},

		makeLogConvertTimestampSection() {
			if(!this.enableConvertTimestamp) {
				return '';
			};
			return E('div', { 'class': 'cbi-value' }, [
				E('label', {
					'class': 'cbi-value-title',
					'for'  : 'convertTimestamp',
				}, _('Date')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('div', { 'class': 'cbi-checkbox' }, [
						this.convertTimestamp,
						E('label', {}),
					]),
					E('div', { 'class': 'cbi-value-description' },
						_('Convert timestamps to a human readable date.')
					),
				]),
			]);
		},

		makeLogTimeFilterSection() {
			return E('div', { 'class': 'cbi-value' }, [
				E('label', {
					'class': 'cbi-value-title',
					'for'  : 'timeFilter',
				}, _('Timestamp filter')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('span', { 'class': 'control-group' }, [
						this.timeFilter,
						E('button', {
							'class': 'cbi-button-neutral btn',
							'click': ev => {
								ev.target.blur();
								ev.preventDefault();
								this.timeFilter.value = null;
								this.timeFilter.focus();
							},
						}, '&#9003;'),
						this.timeFilterReBtn,
					]),
					E('div', { 'class': 'cbi-value-description' },
						_('<code>!pattern</code> - entries that do not match the pattern.')
					),
				]),
			]);
		},

		makeLogHostFilterSection() {
			return E('div', { 'class': 'cbi-value' }, [
				E('label', {
					'class': 'cbi-value-title',
					'for'  : 'hostFilter',
				}, _('Host filter')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('span', { 'class': 'control-group' }, [
						this.hostFilter,
						E('button', {
							'class': 'cbi-button-neutral btn',
							'click': ev => {
								ev.target.blur();
								ev.preventDefault();
								this.hostFilter.value = null;
								this.hostFilter.focus();
							},
						}, '&#9003;'),
						this.hostFilterReBtn,
					]),
					E('div', { 'class': 'cbi-value-description' },
						_('<code>!pattern</code> - entries that do not match the pattern.')
					),
				]),
			]);
		},

		makeLogFacilitiesDropdownSection() {
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

		makeLogLevelsDropdownSection() {
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

		setRegexpValidator(elem, flagEl) {
			ui.addValidator(
				elem,
				'string',
				true,
				v => {
					if(!flagEl.checked()) {
						return true;
					};
					try {
						new RegExp(v, 'giu');
						return true;
					} catch(err) {
						return _('Invalid regular expression') + ':\n' + err.message;
					};
				},
				'blur',
				'focus',
				'input'
			);
		},

		setFilterSettings() {
			this.tailValue = this.checkZeroValue(this.tailInput.value);
			if(this.logTimestampFlag) {
				if(this.enableConvertTimestamp) {
					this.convertTimestampValue = this.convertTimestamp.checked;
				};
				this.timeFilterValue   = this.timeFilter.value;
				this.timeFilterReValue = this.timeFilterReBtn.checked()
			};
			if(this.logHostFlag) {
				this.hostFilterValue   = this.hostFilter.value;
				this.hostFilterReValue = this.hostFilterReBtn.checked()
			};
			if(this.logFacilitiesFlag) {
				this.facilityFilterValue = this.logFacilitiesDropdown.getValue();
			};
			if(this.logLevelsFlag) {
				this.levelFilterValue = this.logLevelsDropdown.getValue();
			};
			this.msgFilterValue   = this.msgFilter.value;
			this.msgFilterReValue = this.msgFilterReBtn.checked()

			this.logSortingValue  = this.logSorting.value;
			this.autoRefreshValue = this.autoRefresh.checked;
			if(this.autorefreshOn) {
				if(this.autoRefreshValue) {
					poll.add(this.pollFuncWrapper, this.pollInterval);
					this.refreshBtn.style.visibility = 'hidden';
				} else {
					poll.remove(this.pollFuncWrapper);
					this.refreshBtn.style.visibility = 'visible';
				};
			};
		},

		resetFormValues() {
			this.tailInput.value = this.tailValue;
			if(this.logTimestampFlag) {
				if(this.enableConvertTimestamp) {
					this.convertTimestamp.checked = this.convertTimestampValue;
				};
				this.timeFilter.value = this.timeFilterValue;
				this.timeFilterReBtn.set(this.timeFilterReValue);
			};
			if(this.logHostFlag) {
				this.hostFilter.value = this.hostFilterValue;
				this.hostFilterReBtn.set(this.hostFilterReValue);
			};
			if(this.logFacilitiesFlag) {
				this.logFacilitiesDropdown.setValue(this.facilityFilterValue);
			};
			if(this.logLevelsFlag) {
				this.logLevelsDropdown.setValue(this.levelFilterValue);
			};
			this.msgFilter.value = this.msgFilterValue;
			this.msgFilterReBtn.set(this.msgFilterReValue);

			this.logSorting.value    = this.logSortingValue;
			this.autoRefresh.checked = this.autoRefreshValue;
		},

		/**
		 * Receives raw log data.
		 * Abstract method, must be overridden by a subclass!
		 *
		 * @instance
		 * @abstract
		 *
		 * @param {number} tail
		 * @returns {string}
		 * Returns the raw content of the log.
		 */
		getLogData(tail) {
			throw new Error('getLogData must be overridden by a subclass');
		},

		/**
		 * Parses log data.
		 * Abstract method, must be overridden by a subclass!
		 *
		 * @instance
		 * @abstract
		 *
		 * @param {string} logdata
		 * @param {number} tail
		 * @returns {Array<number, string|null, string|null, string|null, string|null, string|null>}
		 * Returns an array of values: [ #, Timestamp, Host, Facility, Level, Message ].
		 */
		parseLogData(logdata, tail) {
			throw new Error('parseLogData must be overridden by a subclass');
		},

		/**
		 * Highlights the search result for a pattern.
		 * Abstract method, must be overridden by a subclass!
		 *
		 * To disable the highlight option, views extending
		 * this base class should overwrite the `filterHighlightFunc`
		 * function with `null`.
		 *
		 * @instance
		 * @abstract
		 *
		 * @param {string} logdata
		 * @returns {string}
		 * Returns a string with the highlighted part.
		 */
		filterHighlightFunc(match) {
			throw new Error('filterHighlightFunc must be overridden by a subclass');
		},

		setStringFilter(entriesArray, fieldNum, pattern) {
			let not     = pattern.startsWith('!');
			pattern     = pattern.replace(/^!/, '');
			let isHFunc = (typeof(this.filterHighlightFunc) == 'function');
			let fArr    = [];
			if(!pattern) {
				return entriesArray;
			};
			entriesArray.forEach((e, i) => {
				if(e[fieldNum] == null) {
					return;
				};
				if(not) {
					if(!(e[fieldNum].includes(pattern))) {
						fArr.push(e);
					};
				} else {
					if(e[fieldNum].includes(pattern)) {
						if(isHFunc) {
							e[fieldNum] = e[fieldNum].replace(pattern, this.filterHighlightFunc);
						};
						fArr.push(e);
					};
				};
			});
			return fArr;
		},

		setRegexpFilter(entriesArray, fieldNum, pattern) {
			let not     = pattern.startsWith('!');
			pattern     = pattern.replace(/^!/, '');
			let isHFunc = (typeof(this.filterHighlightFunc) == 'function');
			let fArr    = [];
			if(!pattern) {
				return entriesArray;
			};
			try {
				let regExp = new RegExp(pattern, 'giu');
				entriesArray.forEach((e, i) => {
					if(e[fieldNum] == null) {
						return;
					};
					if(not) {
						if(!(regExp.test(e[fieldNum]))) {
							fArr.push(e);
						};
					} else {
						if(regExp.test(e[fieldNum])) {
							if(isHFunc) {
								e[fieldNum] = e[fieldNum].replace(regExp, this.filterHighlightFunc);
							};
							fArr.push(e);
						};
					};
					regExp.lastIndex = 0;
				});
			} catch(err) {
				if(err.name == 'SyntaxError') {
					return entriesArray;
				} else {
					throw err;
				};
			};
			return fArr;
		},

		setTimeFilter(entriesArray) {
			let fPattern = this.timeFilterValue;
			if(!fPattern) {
				return entriesArray;
			};
			return (this.timeFilterReValue) ?
				this.setRegexpFilter(entriesArray, 1, fPattern) :
					this.setStringFilter(entriesArray, 1, fPattern);
		},

		setHostFilter(entriesArray) {
			let fPattern = this.hostFilterValue;
			if(!fPattern) {
				return entriesArray;
			};
			return (this.hostFilterReValue) ?
				this.setRegexpFilter(entriesArray, 2, fPattern) :
					this.setStringFilter(entriesArray, 2, fPattern);
		},

		setFacilityFilter(entriesArray) {
			let logFacilitiesKeys = Object.keys(this.logFacilities);
			if(logFacilitiesKeys.length > 0 && this.logFacilitiesDropdown) {
				if(this.facilityFilterValue.length == 0) {
					return entriesArray;
				};
				return entriesArray.filter(e => this.facilityFilterValue.includes(e[3]));
			};
			return entriesArray;
		},

		setLevelFilter(entriesArray) {
			let logLevelsKeys = Object.keys(this.logLevels);
			if(logLevelsKeys.length > 0 && this.logLevelsDropdown) {
				if(this.levelFilterValue.length == 0) {
					return entriesArray;
				};
				return entriesArray.filter(e => this.levelFilterValue.includes(e[4]));
			};
			return entriesArray;
		},

		setMsgFilter(entriesArray) {
			let fPattern = this.msgFilterValue;
			if(!fPattern) {
				return entriesArray;
			};
			return (this.msgFilterReValue) ?
				this.setRegexpFilter(entriesArray, 5, fPattern) :
					this.setStringFilter(entriesArray, 5, fPattern);
		},

		/**
		 * Creates the contents of the log area.
		 * Abstract method, must be overridden by a subclass!
		 *
		 * @instance
		 * @abstract
		 *
		 * @param {Array<number, string|null, string|null, string|null, string|null, string|null>} logdataArray
		 * @returns {Node}
		 * Returns a DOM node containing the log area.
		 */
		makeLogArea(logdataArray) {
			throw new Error('makeLogArea must be overridden by a subclass');
		},

		disableFormElems() {
			Array.from(this.logFilterForm.elements).forEach(
				e => e.disabled = true
			);
			this.actionButtons.forEach(e => e.disabled = true);
		},

		enableFormElems() {
			Array.from(this.logFilterForm.elements).forEach(
				e => e.disabled = false
			);
			this.actionButtons.forEach(e => e.disabled = false);
		},

		downloadLog(ev) {
			this.disableFormElems();
			return this.getLogData(0).then(logdata => {
				logdata = logdata || '';
				let link = E('a', {
					'download': this.viewName + '.log',
					'href'    : URL.createObjectURL(
						new Blob([ logdata ], { type: 'text/plain' })),
				});
				link.click();
				URL.revokeObjectURL(link.href);
			}).catch(err => {
				ui.addNotification(null,
					E('p', {}, _('Download error') + ': ' + err.message));
			}).finally(() => {
				this.enableFormElems();
			});
		},

		restoreSettingsFromLocalStorage() {
			let tailValueLocal = localStorage.getItem(`luci-app-${this.viewName}-tailValue`);
			if(tailValueLocal) {
				this.tailValue = Number(tailValueLocal);
			};
			let logSortingLocal = localStorage.getItem(`luci-app-${this.viewName}-logSortingValue`);
			if(logSortingLocal) {
				this.logSortingValue = logSortingLocal;
			};
			if(this.enableConvertTimestamp) {
				let convertTimestampLocal = localStorage.getItem(`luci-app-${this.viewName}-convertTimestampValue`);
				if(convertTimestampLocal) {
					this.convertTimestampValue = Boolean(Number(convertTimestampLocal));
				};
			};
			if(this.enableAutoRefresh) {
				let autoRefreshLocal = localStorage.getItem(`luci-app-${this.viewName}-autoRefreshValue`);
				if(autoRefreshLocal) {
					this.autoRefreshValue = Boolean(Number(autoRefreshLocal));
				};
			};
		},

		saveSettingsToLocalStorage(tailValue, logSortingValue, autoRefreshValue, convertTimestampValue) {
			tailValue = this.checkZeroValue(tailValue);
			if(this.tailValue != tailValue) {
				localStorage.setItem(
					`luci-app-${this.viewName}-tailValue`, String(tailValue));
			};
			if(this.logSortingValue != logSortingValue) {
				localStorage.setItem(
					`luci-app-${this.viewName}-logSortingValue`, logSortingValue);
			};
			if(this.convertTimestampOn) {
				if(this.convertTimestampValue != convertTimestampValue) {
					localStorage.setItem(
						`luci-app-${this.viewName}-convertTimestampValue`, String(Number(convertTimestampValue)));
				};
			};
			if(this.autorefreshOn) {
				if(this.autoRefreshValue != autoRefreshValue) {
					localStorage.setItem(
						`luci-app-${this.viewName}-autoRefreshValue`, String(Number(autoRefreshValue)));
				};
			};
		},

		reloadLog(tail, modal=false, autorefresh=false) {
			tail = (tail && tail > 0) ? tail : 0;
			if(!autorefresh) {
				this.disableFormElems();
				poll.stop();
			};
			return this.getLogData(tail).then(logdata => {
				logdata = logdata || '';
				this.logWrapper.innerHTML = '';
				this.logWrapper.append(
					this.makeLogArea(
						this.setMsgFilter(
							this.setFacilityFilter(
								this.setLevelFilter(
									this.setHostFilter(
										this.setTimeFilter(
											this.parseLogData(logdata, tail)
										)
									)
								)
							)
						)
					)
				);
				if(logdata && logdata !== '') {
					if(this.enableConvertTimestamp && !this.logConvertTimestampElem) {
						this.logConvertTimestampElem = this.makeLogConvertTimestampSection();
					};
					if(this.logTimestampFlag && !this.logTimeFilterElem) {
						this.logTimeFilterElem = this.makeLogTimeFilterSection();
					};
					if(this.logHostFlag && !this.logHostFilterElem) {
						this.logHostFilterElem = this.makeLogHostFilterSection();
					};
					if(this.logFacilitiesFlag && !this.logFacilitiesDropdown) {
						this.logFacilitiesDropdownElem = this.makeLogFacilitiesDropdownSection();
					};
					if(this.logLevelsFlag && !this.logLevelsDropdown) {
						this.logLevelsDropdownElem = this.makeLogLevelsDropdownSection();
					};
				};

				if(!autorefresh) {
					poll.start();
				};
			}).finally(() => {
				if(modal) {
					ui.hideModal();
				};
				if(!autorefresh) {
					this.enableFormElems();
				};
			});
		},

		filterSettingsModal() {
			return ui.showModal(_('Filter settings'), [
				E('div', { 'class': 'cbi-map' },
					E('div', { 'class': 'cbi-section' }, [
						E('div', { 'class': 'cbi-section-node' }, [
							E('div', { 'class': 'cbi-value' }, [
								E('label', {
									'class': 'cbi-value-title',
									'for'  : 'tailInput',
								}, _('Last entries')),
								E('div', { 'class': 'cbi-value-field' },
									E('span', { 'class': 'control-group' }, [
										this.tailInput,
										E('button', {
											'class': 'cbi-button-neutral btn',
											'click': ev => {
												ev.target.blur();
												ev.preventDefault();
												this.tailInput.value = 0;
												this.tailInput.focus();
											},
										}, '&#9003;'),
									])
								),
							]),
							this.logConvertTimestampElem,
							this.logTimeFilterElem,
							this.logHostFilterElem,
							this.logFacilitiesDropdownElem,
							this.logLevelsDropdownElem,
							E('div', { 'class': 'cbi-value' }, [
								E('label', {
									'class': 'cbi-value-title',
									'for'  : 'msgFilter',
								}, _('Message filter')),
								E('div', { 'class': 'cbi-value-field' }, [
									E('span', { 'class': 'control-group' }, [
										this.msgFilter,
										E('button', {
											'class': 'cbi-button-neutral btn',
											'click': ev => {
												ev.target.blur();
												ev.preventDefault();
												this.msgFilter.value = null;
												this.msgFilter.focus();
											},
										}, '&#9003;'),
										this.msgFilterReBtn,
									]),
									E('div', { 'class': 'cbi-value-description' },
										_('<code>!pattern</code> - entries that do not match the pattern.')
									),
								]),
							]),
							E('div', { 'class': 'cbi-value' }, [
								E('label', {
									'class': 'cbi-value-title',
									'for'  : 'logSorting',
								}, _('Sorting entries')),
								E('div', { 'class': 'cbi-value-field' }, this.logSorting),
							]),
							((this.autorefreshOn) ?
								E('div', { 'class': 'cbi-value' }, [
									E('label', {
										'class': 'cbi-value-title',
										'for'  : 'autoRefresh',
									}, _('Auto refresh')),
									E('div', { 'class': 'cbi-value-field' },
										E('div', { 'class': 'cbi-checkbox' }, [
											this.autoRefresh,
											E('label', {}),
										])
									),
								]) : ''),
						]),
					]),
				),
				this.logFilterForm,
				E('div', { 'class': 'right button-row' }, [
					E('button', {
						'class': 'btn',
						'click': ev => {
							ev.target.blur();
							this.resetFormValues();
							this.timeFilter.focus();
							this.msgFilter.focus();
							ui.hideModal();
						},
					}, _('Dismiss')),
					' ',
					E('button', {
						'type' : 'submit',
						'form' : 'logFilterForm',
						'class': 'btn cbi-button-positive important',
						'click': ui.createHandlerFn(this, function(ev) {
							ev.target.blur();
							ev.preventDefault();
							return this.onSubmitFilter();
						}),
					}, _('Apply')),
				]),
			], 'cbi-modal');
		},

		updateLog(autorefresh=false) {
			let tail = (Number(this.tailValue) == 0 || Number(this.fastTailValue) == 0)
				? 0 : Math.max(Number(this.tailValue), this.fastTailValue)
			return this.reloadLog(tail, false, autorefresh);
		},

		/**
		 * Creates a promise for the RPC request.
		 * Abstract method, must be overridden by a subclass!
		 *
		 * To completely disable the auto log refresh option, views extending
		 * this base class should overwrite the `getLogHash` function
		 * with `null`.
		 *
		 * @instance
		 * @abstract
		 *
		 * @returns {Promise}
		 * Returns a promise that returns the unique value for the current log state.
		 */
		getLogHash() {
			throw new Error('getLogHash must be overridden by a subclass');
		},

		/**
		 * Converts the timestamp format.
		 * Abstract method, must be overridden by a subclass!
		 *
		 * To completely disable the convert timrstamp option, views extending
		 * this base class should overwrite the `convertTimestampFunc` function
		 * with `null`.
		 *
		 * @instance
		 * @abstract
		 *
		 * @param {string} t
		 * @returns {String}
		 * Returns the converted timestamp string.
		 */
		convertTimestampFunc(t) {
			throw new Error('convertTimestampFunc must be overridden by a subclass');
		},

		async pollFunc() {
			await this.getLogHash().then(async hash => {
				if(this.lastHash !== hash) {
					this.lastHash = hash;
					return await this.updateLog(true);
				};
			});
		},

		onSubmitFilter() {
			if(this.logSorting.value != this.logSortingValue) {
				if(this.logSorting.value == 'desc') {
					this.logWrapper.after(this.moreEntriesBar);
				} else {
					this.logWrapper.before(this.moreEntriesBar);
				};
			};
			this.saveSettingsToLocalStorage(
				this.tailInput.value, this.logSorting.value,
				this.autoRefresh.checked, this.convertTimestamp.checked);
			this.setFilterSettings();
			this.fastTailValue = Number(this.tailValue);
			return this.reloadLog(Number(this.tailValue), true);
		},

		scrollToTop() {
			this.logWrapper.scrollIntoView(true);
		},

		scrollToBottom() {
			this.logWrapper.scrollIntoView(false);
		},

		load() {
			this.restoreSettingsFromLocalStorage();
			if(!this.enableAutoRefresh || typeof(this.getLogHash) != 'function') {
				this.autorefreshOn    = false;
				this.autoRefreshValue = false;
			};
			if(this.enableConvertTimestamp && typeof(this.convertTimestampFunc) == 'function') {
				this.convertTimestampOn = true;
			};
			return this.getLogData(this.tailValue);
		},

		render(logdata) {
			this.pollFuncWrapper = L.bind(this.pollFunc, this);

			this.logWrapper = E('div', {
				'id': 'logWrapper',
			}, this.makeLogArea(this.parseLogData(logdata, this.tailValue)));

			this.fastTailValue = this.tailValue

			this.tailInput = E('input', {
				'id'       : 'tailInput',
				'name'     : 'tailInput',
				'type'     : 'text',
				'form'     : 'logFilterForm',
				'class'    : 'cbi-input-text',
				'style'    : 'width:4em !important; min-width:4em !important',
				'maxlength': 5,
			});
			this.tailInput.value = this.tailValue;
			ui.addValidator(this.tailInput, 'uinteger', true);

			this.convertTimestamp = E('input', {
				'id'  : 'convertTimestamp',
				'name': 'convertTimestamp',
				'type': 'checkbox',
				'form': 'logFilterForm',
			});
			this.convertTimestamp.checked = this.convertTimestampValue;

			this.timeFilter = E('input', {
				'id'         : 'timeFilter',
				'name'       : 'timeFilter',
				'type'       : 'text',
				'form'       : 'logFilterForm',
				'class'      : 'cbi-input-text',
				'placeholder': _('Type a search pattern...'),
			});

			this.timeFilterReBtn = this.makeRegExpButton(this.timeFilter, this.timeFilterReValue);
			this.setRegexpValidator(this.timeFilter, this.timeFilterReBtn);

			this.hostFilter = E('input', {
				'id'         : 'hostFilter',
				'name'       : 'hostFilter',
				'type'       : 'text',
				'form'       : 'logFilterForm',
				'class'      : 'cbi-input-text',
				'placeholder': _('Type a search pattern...'),
			});

			this.hostFilterReBtn = this.makeRegExpButton(this.hostFilter, this.hostFilterReValue);
			this.setRegexpValidator(this.hostFilter, this.hostFilterReBtn);

			this.logConvertTimestampElem   = '';
			this.logTimeFilterElem         = '';
			this.logHostFilterElem         = '';
			this.logFacilitiesDropdownElem = '';
			this.logLevelsDropdownElem     = '';

			if(this.logTimestampFlag) {
				this.logConvertTimestampElem = this.makeLogConvertTimestampSection();
				this.logTimeFilterElem       = this.makeLogTimeFilterSection();
			};
			if(this.logLevelsFlag) {
				this.logLevelsDropdownElem = this.makeLogLevelsDropdownSection();
			};
			if(this.logFacilitiesFlag) {
				this.logFacilitiesDropdownElem = this.makeLogFacilitiesDropdownSection();
			};
			if(this.logHostFlag) {
				this.logHostFilterElem = this.makeLogHostFilterSection();
			};

			this.msgFilter = E('input', {
				'id'         : 'msgFilter',
				'name'       : 'msgFilter',
				'type'       : 'text',
				'form'       : 'logFilterForm',
				'class'      : 'cbi-input-text',
				'placeholder': _('Type a search pattern...'),
			});

			this.msgFilterReBtn = this.makeRegExpButton(this.msgFilter, this.msgFilterReValue);
			this.setRegexpValidator(this.msgFilter, this.msgFilterReBtn);

			this.logSorting = E('select', {
				'id'   : 'logSorting',
				'name' : 'logSorting',
				'form' : 'logFilterForm',
				'class': "cbi-input-select",
			}, [
				E('option', { 'value': 'asc' }, _('ascending')),
				E('option', { 'value': 'desc' }, _('descending')),
			]);
			this.logSorting.value = this.logSortingValue;

			this.autoRefresh = E('input', {
				'id'   : 'autoRefresh',
				'name' : 'autoRefresh',
				'type' : 'checkbox',
				'form' : 'logFilterForm',
			});
			this.autoRefresh.checked = this.autoRefreshValue;

			this.filterEditsBtn = E('button', {
				'class': 'cbi-button btn cbi-button-action',
				'click': L.bind(this.filterSettingsModal, this),
			}, _('Edit'));

			this.logFilterForm = E('form', {
				'id'    : 'logFilterForm',
				'name'  : 'logFilterForm',
				'style' : 'display:none',
				'submit': ev => {
					ev.preventDefault();
					return this.onSubmitFilter();
				},
			});

			this.logDownloadBtn = E('button', {
				'id'   : 'logDownloadBtn',
				'name' : 'logDownloadBtn',
				'class': 'cbi-button btn',
				'click': ui.createHandlerFn(this, this.downloadLog),
			}, _('Download log'));

			this.refreshBtn = E('button', {
				'title': _('Refresh log'),
				'class': 'cbi-button btn log-side-btn',
				'style': `visibility:${(this.autoRefreshValue) ? 'hidden' : 'visible'}`,
				'click': ui.createHandlerFn(this, function(ev) {
					ev.target.blur();
					return this.updateLog();
				}),
			}, '&#10227;');

			function getMoreEntries(ev) {
				ev.target.blur();
				if(this.fastTailValue === null) {
					this.fastTailValue = Number(this.tailValue);
				};
				if(this.fastTailValue > 0) {
					this.fastTailValue += this.fastTailIncrement;
				};
				return this.reloadLog(this.fastTailValue);
			}

			this.moreEntriesBtn = E('button', {
				'title': _('More entries'),
				'class': 'cbi-button btn log-side-btn',
				'style': 'margin-top:1px !important',
				'click': ui.createHandlerFn(this, getMoreEntries),
			}, `+${this.fastTailIncrement}`);

			this.moreEntriesRowBtn = E('button', {
				'class': 'cbi-button btn',
				'click': ui.createHandlerFn(this, getMoreEntries),
			}, _('More entries'));

			this.moreEntriesBar = E('div', {
				'id'   : 'moreEntriesBar',
				'class': 'center',
			}, this.moreEntriesRowBtn);

			this.allEntriesBtn = E('button', {
				'title': _('All entries'),
				'class': 'cbi-button btn log-side-btn',
				'style': 'margin-top:1px !important',
				'click': ui.createHandlerFn(this, function(ev) {
					ev.target.blur();
					this.fastTailValue = 0;
					return this.reloadLog(0);
				}),
			}, _('All'));

			this.filterModalBtn = E('button', {
				'title': _('Filter settings'),
				'class': 'cbi-button btn log-side-btn',
				'style': 'margin-top:10px !important',
				'click': ev => {
					ev.target.blur();
					this.filterSettingsModal();
				},
			}, '&#9634;');

			this.actionButtons.push(this.filterEditsBtn, this.logDownloadBtn,
									this.refreshBtn, this.moreEntriesBtn,
									this.moreEntriesRowBtn,
									this.allEntriesBtn, this.filterModalBtn);

			document.body.append(
				E('div', {
					'align': 'right',
					'class': 'log-side-block',
				}, [
					this.refreshBtn,
					this.moreEntriesBtn,
					this.allEntriesBtn,
					this.filterModalBtn,
					E('button', {
						'class': 'cbi-button btn log-side-btn',
						'style': 'margin-top:10px !important',
						'click': ev => {
							this.scrollToTop();
							ev.target.blur();
						},
					}, '&#8593;'),
					E('button', {
						'class': 'cbi-button btn log-side-btn',
						'style': 'margin-top:1px !important',
						'click': ev => {
							this.scrollToBottom();
							ev.target.blur();
						},
					}, '&#8595;'),
				])
			);

			if(this.autorefreshOn && this.autoRefreshValue) {
				poll.add(this.pollFuncWrapper, this.pollInterval);
			};

			let logArea = [ this.moreEntriesBar, this.logWrapper ];
			if(this.logSortingValue == 'desc') {
				logArea.reverse();
			};

			return E([
				E('h2', { 'id': 'logTitle', 'class': 'fade-in' }, this.title),
				E('div', { 'class': 'cbi-section-descr fade-in' }),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, [
						E('div', { 'class': 'cbi-value' }, [
							E('label', {
								'class': 'cbi-value-title',
								'for'  : 'filterSettings',
							}, _('Filter settings')),
							E('div', { 'class': 'cbi-value-field' }, [
								E('div', {}, this.filterEditsBtn),
								E('input', {
									'id'  : 'filterSettings',
									'type': 'hidden',
								}),
							]),
						]),
					])
				),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, logArea)
				),
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' },
						E('div', { 'class': 'cbi-value' },
							E('div', {
								'align': 'left',
								'style': 'width:100%',
							}, this.logDownloadBtn)
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
