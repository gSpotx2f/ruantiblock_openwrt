'require fs';
'require rpc';
'require ui';
'require view.ruantiblock.log-widget as abc';
'require view.ruantiblock.tools as tools';

return abc.view.extend({
	viewName       : 'ruantiblock',

	title          : _('Ruantiblock') + ' - ' + _('Log'),

	testRegexp     : new RegExp(/([0-9]{2}:){2}[0-9]{2}/),

	isLoggerChecked: false,

	entriesHandler : null,

	getLogHash     : null,

	// logd
	logdHandler(strArray, lineNum) {
		let logLevel = strArray[5].split('.');
		return [
			lineNum,                                        // #         (Number)
			strArray.slice(0, 5).join(' '),                 // Timestamp (String)
			null,                                           // Host      (String)
			logLevel[0],                                    // Facility  (String)
			logLevel[1],                                    // Level     (String)
			this.htmlEntities(strArray.slice(6).join(' ')), // Message   (String)
		];
	},

	// syslog-ng
	syslog_ngHandler(strArray, lineNum) {
		if(!(strArray[3] in this.logHosts)) {
			this.logHosts[strArray[3]] = this.makeLogHostsDropdownItem(strArray[3]);
		};

		return [
			lineNum,                                        // #         (Number)
			strArray.slice(0, 3).join(' '),                 // Timestamp (String)
			strArray[3],                                    // Host      (String)
			null,                                           // Facility  (String)
			null,                                           // Level     (String)
			this.htmlEntities(strArray.slice(4).join(' ')), // Message   (String)
		];
	},

	checkLogread() {
		return Promise.all([
			L.resolveDefault(fs.stat('/sbin/logread'), null),
			L.resolveDefault(fs.stat('/usr/sbin/logread'), null),
		]).then(stat => {
			let logger = (stat[0]) ? stat[0].path : (stat[1]) ? stat[1].path : null;
			if(logger) {
				this.logger = logger;
			} else {
				throw new Error(_('Logread not found'));
			};
		});
	},

	async getLogData(tail, extraTstamp=false) {
		if(!this.logger) {
			await this.checkLogread();
		};
		let loggerArgs = [];
		loggerArgs.push('-e', tools.appName + ':');
		if(extraTstamp) {
			loggerArgs.push('-t');
		};
		return fs.exec_direct(this.logger, loggerArgs, 'text').catch(err => {
			throw new Error(_('Unable to load log data:') + ' ' + err.message);
		});
	},

	parseLogData(logdata, tail) {
		if(!logdata) {
			return [];
		};

		let unsupportedLog = false;
		let strings        = logdata.trim().split(/\n/);

		if(tail && tail > 0 && strings) {
			strings = strings.slice(-tail);
		};

		this.totalLogLines = strings.length;

		let entriesArray   = strings.map((e, i) => {
			let strArray   = e.split(/\s+/);

			if(!this.isLoggerChecked) {
				/**
				 * Checking the fourth field of a line.
				 * If it contains time then logd.
				*/
				if(this.testRegexp.test(strArray[3])) {
					this.isFacilities   = true;
					this.isLevels       = true;
					this.logHosts       = {};
					this.entriesHandler = this.logdHandler;
				}
				/**
				 * Checking the third field of a line.
				 * If it contains time then syslog-ng.
				*/
				else if(this.testRegexp.test(strArray[2])) {
					this.isHosts        = true;
					this.logFacilities  = {};
					this.logLevels      = {};
					this.entriesHandler = this.syslog_ngHandler;
				} else {
					unsupportedLog = true;
					return;
				};
				this.isLoggerChecked = true;
			};

			return this.entriesHandler(strArray, i + 1);
		});

		if(unsupportedLog) {
			throw new Error(_('Unable to load log data:') + ' ' + _('Unsupported log format'));
		} else {
			if(this.logSortingValue === 'desc') {
				entriesArray.reverse();
			};

			return entriesArray;
		};
	},
});
