'use strict';
'require fs';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

return view.extend({
	crontabRegexp: new RegExp(
		`^(\\*?\\/?(\\d){0,2}\\s){5}${tools.execPath} update`),

	currentCrontabLines: [],

	toDD: function(n){
		return String(n).replace(/^(\d)$/, "0$1");
	},

	cronStatusString: function(s) {
		return s || _('No Sсhedule');
	},

	stringifyRuabTasks: function(str_array) {
		let current_tasks = str_array.filter(s => s.match(this.crontabRegexp));
		return current_tasks.join('\n');
	},

	setCronStatus: function(value) {
		document.getElementById('cron_status').value = this.cronStatusString(value);
		document.getElementById("btn_cron_del").style.visibility = (value) ?
			'visible' : 'hidden';
	},

	writeCronFile: function() {
		let btn_cron_add   = document.getElementById('btn_cron_add');
		let btn_cron_del   = document.getElementById('btn_cron_del');
		let crontab_string = this.currentCrontabLines.join('\n');

		return fs.write(tools.crontabFile, crontab_string).then(rc => {
				ui.addNotification(null, E('p',_('Changes have been saved.')), 'info');
				this.setCronStatus(this.stringifyRuabTasks(this.currentCrontabLines));
			}).then(() => {
				return tools.getInitStatus('cron').then(res => {
					 if(!res) {
						return tools.handleServiceAction('cron', 'enable');
					};
				});
			}).finally(() => {
				return tools.handleServiceAction('cron', 'restart');
			}).catch(e => {
				ui.addNotification(null, E('p', _('Unable to save the changes')
					+ ': %s [ %s ]'.format(
						e.message, tools.crontabFile
				)));
			});
	},

	delRuabShedules: function() {
		this.currentCrontabLines = this.currentCrontabLines.filter(
			s => s.match(this.crontabRegexp) ? false : true);
	},

	delCronSchedule: function(ev) {
		this.delRuabShedules();
		return this.writeCronFile();
	},

	setCronSchedule: function(ev) {
		let hour_interval = document.getElementById('cron_hour_interval').value;
		let day_interval  = document.getElementById('cron_day_interval').value;
		let hour          = document.getElementById('cron_hour').value;
		let min           = document.getElementById('cron_min').value;
		let task_string   = '%s %s %s * * %s update\n'.format(
			min,
			(!hour_interval) ? hour :
				(hour_interval == "1") ?
					'*'
				:
					'*/' + hour_interval,
			(hour_interval || day_interval == "1") ?
				'*'
			:
				'*/' + day_interval,
			tools.execPath
		);

		this.delRuabShedules();
		this.currentCrontabLines.push(task_string);

		return this.writeCronFile();
	},

	onchangeHourInterval: function(e) {
		let value                  = e.target.value;
		let bool                   = (value != '');
		let cron_hour              = document.getElementById('cron_hour');
		let cron_day_interval      = document.getElementById('cron_day_interval');
		cron_hour.disabled         = bool;
		cron_day_interval.disabled = bool;

		// For luci-theme-material
		if(bool) {
			cron_hour.style.opacity         = '50%';
			cron_day_interval.style.opacity = '50%';
		} else {
			cron_hour.style.opacity         = '100%';
			cron_day_interval.style.opacity = '100%';
		};
	},

	load: function() {
		return fs.lines(tools.crontabFile).catch(e => {
			ui.addNotification(null, E('p', _('Unable to read the contents')
				+ ': %s [ %s ]'.format(
					e.message, tools.crontabFile
			)));
		});
	},

	render: function(content) {
		this.currentCrontabLines = content;
		let current_task = this.stringifyRuabTasks(content);

		let cron_status = E('textarea', {
			'id'        : 'cron_status',
			'name'      : 'cron_status',
			'style'     : 'width:100% !important; padding:5px 10px 5px 10px !important; resize:none !important;',
			'readonly'  : 'readonly',
			'wrap'      : 'off',
			'rows'      : 2,
			'spellcheck': 'false',
		}, this.cronStatusString(current_task));

		let btn_cron_del = E('button', {
			'class': 'cbi-button btn cbi-button-reset',
			'id'   : 'btn_cron_del',
			'name' : 'btn_cron_del',
		}, _('Reset'));
		btn_cron_del.onclick          = ui.createHandlerFn(this, this.delCronSchedule);
		btn_cron_del.style.visibility = (current_task) ? 'visible' : 'hidden';

		let status_header = E('div', { 'class': 'cbi-section-node' }, [
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title', 'for': 'cron_status' },
					_('Current schedule')),
				E('div', { 'class': 'cbi-value-field' },
					cron_status),
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title', 'for': 'btn_cron_del_hidden' }),
				E('div', { 'class': 'cbi-value-field' }, [
					E('div', {}, btn_cron_del),
					E('input', {
						'id'  : 'btn_cron_del_hidden',
						'type': 'hidden',
					}),
				]),
			])
		]);

		let layout = E('div', { 'class': 'cbi-section-node' });

		function layout_append(elem, title, descr) {
			descr = (descr) ? E('div', { 'class': 'cbi-value-description' }, descr) : '';
			layout.append(
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': elem.id || null },
						title),
					E('div', { 'class': 'cbi-value-field' },
						[ elem, descr ]),
				])
			)
		};

		layout_append(E('b', {}, _('Interval')));

		let cron_hour_interval = E('select', {
			'id'   : 'cron_hour_interval',
			'style': 'width:60px !important; min-width:60px !important',
		}, [
			E('option', { 'value': '' }, ''),
			E('option', { 'value': '1' }, '&#8727;')
		]);
		for(let i = 2; i <= 12 ; i += 2) {
			cron_hour_interval.append(
				E('option', { 'value': String(i) }, '&#8727;/' + i)
			);
		};
		layout_append(cron_hour_interval, _('Hour'));
		cron_hour_interval.onchange = this.onchangeHourInterval;

		let cron_day_interval = E('select', {
			'id'   : 'cron_day_interval',
			'style': 'width:60px !important; min-width:60px !important',
		},
			E('option', { 'value': '1' }, '&#8727;')
		);
		for(let i = 2; i < 8 ; i++) {
			cron_day_interval.append(
				E('option', { 'value': String(i) }, '&#8727;/' + i)
			);
		};
		cron_day_interval.append(E('option', { 'value': '14' }, '&#8727;/14'));
		cron_day_interval.append(E('option', { 'value': '28' }, '&#8727;/28'));
		layout_append(cron_day_interval,  _('Day'));

		layout_append(E('b', {}, _('Time')));

		let cron_hour = E('select', {
			'id'   : 'cron_hour',
			'style': 'width:60px !important; min-width:60px !important',
		});
		for(let i = 0; i < 24 ; i++) {
			cron_hour.append(
				E('option', { 'value': String(i) }, this.toDD(i))
			);
		};
		layout_append(cron_hour, _('Hour'));

		let cron_min = E('select', {
			'id'   : 'cron_min',
			'style': 'width:60px !important; min-width:60px !important',
		});
		for(let i = 0; i < 60 ; i++) {
			cron_min.append(
				E('option', { 'value': String(i) }, this.toDD(i))
			);
		};
		layout_append(cron_min, _('Minute'));

		let btn_cron_add = E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title', 'for': 'btn_cron_add_hidden' }),
			E('div', { 'class': 'cbi-value-field' }, [
				E('div', {},
					E('button', {
						'class': 'btn cbi-button-save',
						'id'   : 'btn_cron_add',
						'name' : 'btn_cron_add',
						'click': ui.createHandlerFn(this, this.setCronSchedule),
					}, _('Set'))
				),
				E('input', {
					'id'  : 'btn_cron_add_hidden',
					'type': 'hidden',
				}),
			]),
		]);
		layout.append(btn_cron_add);

		return E([
			E('h2',
				{ 'class': 'fade-in' },
				_('Ruantiblock') + ' - ' + _('Blacklist updates') + ' (cron)'
			),
			E('div', { 'class': 'cbi-section-descr fade-in' }),
			E('div', { 'class': 'cbi-section fade-in' }, status_header),
			E('div', { 'class': 'cbi-section fade-in' }, layout),
		]);

	},

	handleSave     : null,
	handleSaveApply: null,
	handleReset    : null,
});
