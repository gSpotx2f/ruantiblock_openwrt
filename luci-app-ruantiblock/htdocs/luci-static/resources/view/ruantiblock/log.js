'require fs';
'require ui';
'require view.ruantiblock.abstract-log as abc';
'require view.ruantiblock.tools as tools';

return abc.view.extend({
	viewName       : 'ruantiblock',

	title          : _('Ruantiblock') + ' - ' + _('Log'),

	testRegexp     : new RegExp(/([0-9]{2}:){2}[0-9]{2}/),

	isLoggerChecked: false,

	entriesHandler : null,

	// logd
	logdHandler: function(strArray, lineNum) {
		let logLevel = strArray[5].split('.');
		return [
			lineNum,                                        // #         (Number)
			strArray.slice(0, 5).join(' '),                 // Timestamp (String)
			null,                                           // Host      (String)
			logLevel[1],                                    // Level     (String)
			logLevel[0],                                    // Facility  (String)
			this.htmlEntities(strArray.slice(6).join(' ')), // Message   (String)
		];
	},

	// syslog-ng
	syslog_ngHandler: function(strArray, lineNum) {
		if(!(strArray[3] in this.logHosts)) {
			this.logHosts[strArray[3]] = this.makelogHostsDropdownItem(strArray[3]);
		};

		return [
			lineNum,                                        // #         (Number)
			strArray.slice(0, 3).join(' '),                 // Timestamp (String)
			strArray[3],                                    // Host      (String)
			null,                                           // Level     (String)
			null,                                           // Facility  (String)
			this.htmlEntities(strArray.slice(4).join(' ')), // Message   (String)
		];
	},

	getLogData: function(tail) {
		return Promise.all([
			L.resolveDefault(fs.stat('/sbin/logread'), null),
			L.resolveDefault(fs.stat('/usr/sbin/logread'), null),
		]).then(stat => {
			let logger = (stat[0]) ? stat[0].path : (stat[1]) ? stat[1].path : null;

			if(logger) {
				return fs.exec_direct(logger, [ '-e', tools.appName + ':' ]).catch(err => {
					ui.addNotification(
						null, E('p', {}, _('Unable to load log data:') + ' ' + err.message));
					return '';
				});
			};
		});
	},

	parseLogData: function(logdata, tail) {
		if(!logdata) {
			return [];
		};

		let strings = logdata.trim().split(/\n/);

		if(tail && tail > 0 && strings) {
			strings = strings.slice(-tail);
		};

		this.totalLogLines = strings.length;

		let entriesArray = strings.map((e, i) => {
			let strArray = e.split(/\s+/);

			if(!this.isLoggerChecked) {
				/**
				 * Checking the third field of a line.
				 * If it contains time then syslog-ng.
				*/
				if(this.testRegexp.test(strArray[2])) {
					this.isHosts        = true;
					this.logLevels      = {};
					this.entriesHandler = this.syslog_ngHandler;
				} else {
					this.isLevels       = true;
					this.entriesHandler = this.logdHandler;
				};
				this.isLoggerChecked = true;
			};

			return this.entriesHandler(strArray, i + 1);
		});

		if(this.logSortingValue === 'desc') {
			entriesArray.reverse();
		};

		return entriesArray;
	},
});
