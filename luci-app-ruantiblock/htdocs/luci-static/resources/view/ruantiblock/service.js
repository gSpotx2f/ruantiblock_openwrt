'use strict';
'require baseclass';
'require fs';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

const btn_style_neutral  = 'btn'
const btn_style_action   = 'btn cbi-button-action';
const btn_style_positive = 'btn cbi-button-save important';
const btn_style_negative = 'btn cbi-button-reset important';
const btn_style_warning  = 'btn cbi-button-negative important'

return view.extend({
	statusTokenValue: null,

	callServicesList: rpc.declare({
		object: 'service',
		method: 'list',
		expect: { '': {} }
	}),

	dialogDestroy: baseclass.extend({
		__init__(context) {
			this.context = context;
		},

		currentDnsmasqCfgDir: null,

		dnsmasqCfgDirsSelect: null,

		cancelButton        : E('button', {
			'id'   : 'btn_cancel',
			'class': btn_style_neutral,
			'click': ui.hideModal,
		}, _('Cancel')),

		load() {
			return this.context.callServicesList();
		},

		render(data) {
			let section               = uci.get(tools.appName, 'config');
			this.currentDnsmasqCfgDir = section.dnsmasq_confdir;
			let available_cfg_dirs    = [];

			if(data.dnsmasq && data.dnsmasq.instances) {
				let ubus_dirs = new Set();
				for(let [k, v] of Object.entries(data.dnsmasq.instances)) {
					if(v.mount) {
						for(let i of Object.keys(v.mount)) {
							if(!ubus_dirs.has(i) && i.startsWith('/tmp/dnsmasq.')) {
								if(i == '/tmp/dnsmasq.d') {
									k = _('default');
								};
								available_cfg_dirs.push([ `${i} [ ${k} ]`, i ]);
								ubus_dirs.add(i);
							};
						};
					};
				};
			};

			if(this.currentDnsmasqCfgDir) {
				let match = false;
				for(let i of available_cfg_dirs) {
					if(i[1] == this.currentDnsmasqCfgDir) {
						match = true;
						break;
					};
				};
				if(!match) {
					available_cfg_dirs.unshift(
						[ `${this.currentDnsmasqCfgDir} [ UCI ]`, this.currentDnsmasqCfgDir ]
					);
				};
			};

			this.dnsmasqCfgDirsSelect = E('select', {
				'id'   : 'dnsmasq_confdirs_list',
				'class': 'cbi-input-select',
			}),

			available_cfg_dirs.forEach(e => {
				this.dnsmasqCfgDirsSelect.append(
					E('option', { 'value': e[1] }, e[0]));
			});
			this.dnsmasqCfgDirsSelect.value = this.currentDnsmasqCfgDir;

			ui.showModal(this.title, [
				E('h4', _('The service will be disabled and all blacklist data will be deleted. Continue?')),
				E('div', { 'class': 'cbi-section' }, [
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' },
							_('Dnsmasq config directory')),
						E('div', { 'class': 'cbi-value-field' }, [
							this.dnsmasqCfgDirsSelect,
							E('div', { 'class': 'cbi-value-description' },
								_('Change dnsmasq config directory')),
						]),
					]),
				]),
				E('div', { 'class': 'right button-row' }, [
					this.cancelButton,
					' ',
					E('button', {
						'id'   : 'btn_apply',
						'class': btn_style_warning,
						'click': ui.createHandlerFn(this, this.handleApply),
					}, _('Shutdown')),
				]),
			], 'cbi-modal');
		},

		handleApply(ev) {
			this.cancelButton.disabled = true;
			return this.context.appAction('destroy').then(() => {
				if(this.dnsmasqCfgDirsSelect.value !== this.currentDnsmasqCfgDir) {
					uci.set(tools.appName, 'config', 'dnsmasq_confdir',
							this.dnsmasqCfgDirsSelect.value);
					uci.save();
					uci.apply();
				};
			}).finally(() => {
				this.cancelButton.disabled = false;
				ui.hideModal();
			});
		},

		error(e) {
			ui.showModal(this.title, [
				E('div', { 'class': 'cbi-section' },
					E('p', {}, _('An error occurred')
						+ ': %s'.format(e.message))
				),
				E('div', { 'class': 'right' },
					E('button', {
						'class': btn_style_neutral,
						'click': ui.hideModal,
					}, _('Dismiss'))
				),
			]);
		},

		show() {
			ui.showModal(null,
				E('p', { 'class': 'spinning' }, _('Loading'))
			);
			this.load().then(content => {
				ui.hideModal();
				return this.render(content);
			}).catch(e => {
				ui.hideModal();
				return this.error(e);
			})
		},
	}),

	disableButtons(bool, btn, elems=[]) {
		let btn_start   = elems[1] || document.getElementById('btn_start');
		let btn_destroy = elems[4] || document.getElementById('btn_destroy');
		let btn_enable  = elems[2] || document.getElementById('btn_enable');
		let btn_update  = elems[3] || document.getElementById('btn_update');

		btn_start.disabled   = bool;
		btn_update.disabled  = bool;
		btn_destroy.disabled = bool;
		if(btn === btn_update) {
			btn_enable.disabled = false;
		} else {
			btn_enable.disabled = bool;
		};
	},

	getAppStatus() {
		return Promise.all([
			fs.exec(tools.execPath, [ 'raw-status' ]),
			fs.exec(tools.execPath, [ 'vpn-route-status' ]),
			tools.getInitStatus(tools.appName),
			L.resolveDefault(fs.read(tools.tokenFile), 0),
			uci.load(tools.appName),
		]).catch(e => {
			ui.addNotification(null, E('p', _('Unable to execute or read contents')
				+ ': %s [ %s | %s | %s ]'.format(
					e.message, tools.execPath, 'tools.getInitStatus', 'uci.ruantiblock'
			)));
		});
	},

	setAppStatus(status_array, elems=[], force_app_code) {
		let status_elem       = elems[0] || document.getElementById('status');
		status_elem.innerHTML = '';
		let section = uci.get(tools.appName, 'config');
		if(!status_array || typeof(section) !== 'object') {
			status_elem.append(tools.makeStatusString(1));
			ui.addNotification(null, E('p', _('Unable to read the contents')
				+ ': setAppStatus()'));
			this.disableButtons(true, null, elems);
			return;
		};

		let app_status_code	      = (force_app_code) ? force_app_code : status_array[0].code;
		let vpn_route_status_code = status_array[1].code;
		let enabled_flag          = status_array[2];
		let dnsmasq_confdir       = section.dnsmasq_confdir;
		let bllist_preset         = section.bllist_preset;
		let bllist_module         = section.bllist_module;

		let btn_enable = elems[2] || document.getElementById('btn_enable');
		if(enabled_flag == true) {
			btn_enable.onclick	 = ui.createHandlerFn(
				this, this.serviceAction, 'disable', 'btn_enable');
			btn_enable.textContent = _('Enabled');
			btn_enable.className   = btn_style_positive;
		} else {
			btn_enable.onclick	 = ui.createHandlerFn(
				this, this.serviceAction, 'enable', 'btn_enable');
			btn_enable.textContent = _('Disabled');
			btn_enable.className   = btn_style_negative;
		};

		let btn_start   = elems[1] || document.getElementById('btn_start');
		let btn_update  = elems[3] || document.getElementById('btn_update');
		let btn_destroy = elems[4] || document.getElementById('btn_destroy');

		let btnStartStateOn = () => {
			btn_start.onclick	 = ui.createHandlerFn(
				this, this.appAction, 'stop', 'btn_start');
			btn_start.textContent = _('Enabled');
			btn_start.className   = btn_style_positive;
		}

		let btnStartStateOff = () => {
			btn_start.onclick	 = ui.createHandlerFn(
				this, this.appAction,'start', 'btn_start');
			btn_start.textContent = _('Disabled');
			btn_start.className   = btn_style_negative;
		}

		if(app_status_code == 0) {
			this.disableButtons(false, null, elems);
			btnStartStateOn();
			btn_destroy.disabled = false;
			btn_update.disabled  = false;
		}
		else if(app_status_code == 2) {
			this.disableButtons(false, null, elems);
			btnStartStateOff();
			btn_update.disabled = true;
		}
		else if(app_status_code == 3) {
			btnStartStateOff();
			this.disableButtons(true, btn_start, elems);
		}
		else if(app_status_code == 4) {
			btnStartStateOn();
			this.disableButtons(true, btn_update, elems);
		}
		else {
			ui.addNotification(null, E('p', _('Error')
				+ ' %s: return code = %s'.format(tools.execPath, app_status_code)));
			this.disableButtons(true, null, elems);
		};

		status_elem.append(tools.makeStatusString(
			app_status_code,
			bllist_preset,
			bllist_module,
			vpn_route_status_code)
		);

		if(!poll.active()) {
			poll.start();
		};
	},

	serviceAction(action, button) {
		if(button) {
			let elem = document.getElementById(button);
			this.disableButtons(true, elem);
		};

		poll.stop();

		return tools.handleServiceAction(tools.appName, action).then(() => {
			return this.getAppStatus().then(
				(status_array) => {
					this.setAppStatus(status_array);
				}
			);
		});
	},

	appAction(action, button) {
		if(button) {
			let elem = document.getElementById(button);
			this.disableButtons(true, elem);
		};

		poll.stop();

		if(action === 'update') {
			this.getAppStatus().then(status_array => {
				this.setAppStatus(status_array, [], 4);
			});
		};

		return fs.exec_direct(tools.execPath, [ action ]).then(res => {
			return this.getAppStatus().then(
				(status_array) => {
					this.setAppStatus(status_array);
				}
			);
		});
	},

	statusPoll() {
		return fs.read(tools.tokenFile).then(v => {
			v = tools.normalizeValue(v);
			if(v != this.statusTokenValue) {
				this.getAppStatus().then(
					L.bind(this.setAppStatus, this)
				);
			}
			this.statusTokenValue = v;
		}).catch(e => {
			this.statusTokenValue = 0;
		});
	},

	load() {
		return this.getAppStatus();
	},

	render(status_array) {
		if(!status_array) {
			return;
		};

		let section           = uci.get(tools.appName, 'config');
		this.statusTokenValue = (Array.isArray(status_array)) ?
			tools.normalizeValue(status_array[4]) : null;
		let dialog_destroy    = new this.dialogDestroy(this);

		let status_string = E('div', {
			'id'   : 'status',
			'name' : 'status',
			'class': 'cbi-section-node',
		});

		let layout = E('div', { 'class': 'cbi-section-node' });

		function layout_append(elem, title, descr) {
			descr = (descr) ? E('div', { 'class': 'cbi-value-description' }, descr) : '';
			layout.append(
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': elem.id + '_hidden' || null }, title),
					E('div', { 'class': 'cbi-value-field' }, [
						E('div', {}, elem),
						E('input', {
							'id'  : elem.id + '_hidden',
							'type': 'hidden',
						}),
						descr,
					]),
				])
			)
		};

		let btn_start = E('button', {
			'id'   : 'btn_start',
			'name' : 'btn_start',
			'class': btn_style_action,
		}, _('Enable'));
		layout_append(btn_start, _('Service'));

		let btn_enable = E('button', {
			'id'   : 'btn_enable',
			'name' : 'btn_enable',
			'class': btn_style_positive,
		}, _('Enable'));
		layout_append(btn_enable, _('Run at startup'));

		let btn_update = E('button', {
			'id'   : 'btn_update',
			'name' : 'btn_update',
			'class': btn_style_action,
		}, _('Update'));
		btn_update.onclick = ui.createHandlerFn(this, () => { this.appAction('update', 'btn_update') });
		layout_append(btn_update, _('Update blacklist'));

		let btn_destroy = E('button', {
			'id'   : 'btn_destroy',
			'name' : 'btn_destroy',
			'class': btn_style_negative,
		}, _('Shutdown'));
		btn_destroy.onclick = () => dialog_destroy.show();

		layout_append(btn_destroy, _('Shutdown'),
			_('Complete service shutdown, as well as deleting nftsets and blacklist data'));

		this.setAppStatus(status_array, [
			status_string,
			btn_start,
			btn_enable,
			btn_update,
			btn_destroy,
		]);

		poll.add(L.bind(this.statusPoll, this));

		return E([
			E('h2', { 'class': 'fade-in' }, _('Ruantiblock')),
			E('div', { 'class': 'cbi-section-descr fade-in' },
				E('a', {
				'href': 'https://github.com/gSpotx2f/ruantiblock_openwrt/wiki',
				'target': '_blank' },
				'https://github.com/gSpotx2f/ruantiblock_openwrt/wiki')
			),
			E('div', { 'class': 'cbi-section fade-in' }, [
				status_string,
				E('hr'),
			]),
			E('div', { 'class': 'cbi-section fade-in' },
				layout
			),
		]);
	},

	handleSave	 : null,
	handleSaveApply: null,
	handleReset	: null,
});
