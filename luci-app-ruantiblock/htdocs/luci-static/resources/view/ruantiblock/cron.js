'use strict';
'require fs';
'require ui';
'require view.ruantiblock.tools as tools';

return L.view.extend({
	crontabRegexp: new RegExp(
		`^(\\*?\\/?(\\d){0,2}\\s){5}${tools.execPath} update(\n)?`, 'gm'),

	currentCrontabContent: null,

	toDD: function(n){
		return String(n).replace(/^(\d)$/, "0$1");
	},

	cronStatusString: function(s) {
		return s || _('No Shedule');
	},

	pickCronTask: function(content) {
		if(!content){
			return;
		};
		let current_tasks = content.match(this.crontabRegexp) || [];
		return current_tasks.join('');
	},

	setCronStatus: function(value) {
		document.getElementById('cron_status').value = this.cronStatusString(value);
		document.getElementById("btn_cron_del").style.visibility = (value) ?
			'visible' : 'hidden';
	},

	writeCronFile: function() {
		let btn_cron_add = document.getElementById('btn_cron_add');
		let btn_cron_del = document.getElementById('btn_cron_del');

		if(!this.currentCrontabContent) {
			ui.addNotification(null, E('p', _('No changes to save.')));
			btn_cron_add.disabled = false;
			return;
		};

		return fs.write(tools.crontabFile, this.currentCrontabContent).then(rc => {
				ui.addNotification(null, E('p',_('Changes have been saved.')), 'info');
				this.setCronStatus(this.pickCronTask(this.currentCrontabContent));
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

	delCronSchedule: function(ev) {
		if(this.currentCrontabContent) {
			this.currentCrontabContent = this.currentCrontabContent.replace(
				this.crontabRegexp, "");
		};
		return this.writeCronFile();
	},

	setCronSchedule: function(ev) {
		let hour_interval = document.getElementById('cron_hour_interval').value;
		let day_interval  = document.getElementById('cron_day_interval').value;
		let hour          = document.getElementById('cron_hour').value;
		let min           = document.getElementById('cron_min').value;
		let task_string   = '%s %s %s * * %s update\n'.format(
			min,
			(!hour_interval) ? hour : (hour_interval == "1") ? '*' : '*/' + hour_interval,
			(hour_interval || day_interval == "1") ? '*' : '*/' + day_interval,
			tools.execPath
		);
		if(this.currentCrontabContent) {
			this.currentCrontabContent = this.currentCrontabContent.replace(
				this.crontabRegexp, "") + task_string;
		};
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
		return fs.read(tools.crontabFile).catch(e => {
			ui.addNotification(null, E('p', _('Unable to read the contents')
				+ ': %s [ %s ]'.format(
					e.message, tools.crontabFile
			)));
		});
	},

	render: function(content) {
		this.currentCrontabContent = content;
		let current_task = this.pickCronTask(content);

		let cron_status = E('textarea', {
			'id': 'cron_status',
			'name': 'cron_status',
			'style': 'width:100% !important; padding:5px 10px 5px 10px !important; resize:none !important;',
			'readonly': 'readonly',
			'wrap': 'off',
			'rows': 2,
		}, this.cronStatusString(current_task));

		let btn_cron_del = E('button', {
			'class': 'cbi-button btn cbi-button-reset',
			'id': 'btn_cron_del',
			'name': 'btn_cron_del',
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
				E('label', { 'class': 'cbi-value-title', 'for': 'btn_cron_del' }),
				E('div', { 'class': 'cbi-value-field' },
					btn_cron_del),
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

		let cron_hour_interval = E('select',
			{ 'id': 'cron_hour_interval', 'style': 'width:60px !important; min-width:60px !important' }, [
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

		let cron_day_interval = E('select',
			{ 'id': 'cron_day_interval', 'style': 'width:60px !important; min-width:60px !important' },
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

		let cron_hour = E('select',
			{ 'id': 'cron_hour', 'style': 'width:60px !important; min-width:60px !important' });
		for(let i = 0; i < 24 ; i++) {
			cron_hour.append(
				E('option', { 'value': String(i) }, this.toDD(i))
			);
		};
		layout_append(cron_hour, _('Hour'));

		let cron_min = E('select',
			{ 'id': 'cron_min', 'style': 'width:60px !important; min-width:60px !important' });
		for(let i = 0; i < 60 ; i++) {
			cron_min.append(
				E('option', { 'value': String(i) }, this.toDD(i))
			);
		};
		layout_append(cron_min, _('Minute'));

		let btn_cron_add = E('button', {
			'class': 'btn cbi-button-save',
			'id': 'btn_cron_add',
			'name': 'btn_cron_add'
		}, _('Set'));
		btn_cron_add.onclick = ui.createHandlerFn(this, this.setCronSchedule);
		layout_append(btn_cron_add);

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
