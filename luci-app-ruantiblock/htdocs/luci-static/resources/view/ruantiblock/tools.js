'use strict';
'require baseclass';
'require fs';
'require rpc';
'require ui';

document.head.append(E('style', {'type': 'text/css'},
`
.label-status {
	display: inline-block;
	margin: 2px !important;
	padding: 2px 4px;
	-webkit-border-radius: 3px;
	-moz-border-radius: 3px;
	border-radius: 3px;
	font-weight: bold;
	color: #fff !important;
	word-wrap: break-word !important;
}
.starting {
	background-color: #9c994c !important;
}
.running {
	background-color: #2ea256 !important;
}
.updating {
	background-color: #1e82ff !important;
}
.stopped {
	background-color: #8a8a8a !important;
}
.error {
	background-color: #ff4e54 !important;
}
`));

return baseclass.extend({
	appName             : 'ruantiblock',
	execPath            : '/usr/bin/ruantiblock',
	tokenFile           : '/var/run/ruantiblock.token',
	parsersDir          : '/usr/libexec/ruantiblock',
	torrcFile           : '/etc/tor/torrc',
	userEntriesFile     : '/etc/ruantiblock/user_entries',
	userListsDir        : '/etc/ruantiblock/user_lists',
	bypassEntriesFile   : '/etc/ruantiblock/bypass_entries',
	fqdnFilterFile      : '/etc/ruantiblock/fqdn_filter',
	ipFilterFile        : '/etc/ruantiblock/ip_filter',
	grExcludedNetsFile  : '/etc/ruantiblock/gr_excluded_nets',
	grExcludedSldFile   : '/etc/ruantiblock/gr_excluded_sld',
	crontabFile         : '/etc/crontabs/root',
	infoLabelStarting   : E('span', { 'class': 'label-status starting' }, _('Starting')),
	infoLabelRunning    : E('span', { 'class': 'label-status running' }, _('Enabled')),
	infoLabelUpdating   : E('span', { 'class': 'label-status updating' }, _('Updating')),
	infoLabelStopped    : E('span', { 'class': 'label-status stopped' }, _('Disabled')),
	infoLabelError      : E('span', { 'class': 'label-status error' }, _('Error')),

	blacklistPresets: {
		'ruantiblock-fqdn': [ 'ruantiblock', 'fqdn', 'https://github.com/gSpotx2f/ruantiblock_blacklist' ],
		'ruantiblock-ip'  : [ 'ruantiblock', 'ip', 'https://github.com/gSpotx2f/ruantiblock_blacklist' ],
		'zapret-info-fqdn': [ '*zapret-info', 'fqdn', 'https://github.com/zapret-info/z-i' ],
		'zapret-info-ip'  : [ '*zapret-info', 'ip', 'https://github.com/zapret-info/z-i' ],
		'rublacklist-fqdn': [ '*rublacklist', 'fqdn', 'https://rublacklist.net' ],
		'rublacklist-ip'  : [ '*rublacklist', 'ip', 'https://rublacklist.net' ],
		'antifilter-ip'   : [ '*antifilter', 'ip', 'https://antifilter.download' ],
	},

	defaultConfig: {
		'proxy_mode'      : '2',
		'tor_trans_port'  : '9040',
		'onion_dns_addr'  : '127.0.0.1#9053',
		'if_vpn'          : 'tun0',
		't_proxy_port_tcp': '1100',
		't_proxy_port_udp': '1100',
	},

	callInitStatus: rpc.declare({
		object: 'luci',
		method: 'getInitList',
		params: [ 'name' ],
		expect: { '': {} }
	}),

	callInitAction: rpc.declare({
		object: 'luci',
		method: 'setInitAction',
		params: [ 'name', 'action' ],
		expect: { result: false }
	}),

	getInitStatus(name) {
		return this.callInitStatus(name).then(res => {
			if(res) {
				return res[name].enabled;
			} else {
				throw _('Command failed');
			}
		}).catch(e => {
			ui.addNotification(null,
				E('p', _('Failed to get %s init status: %s').format(name, e)));
		});
	},

	handleServiceAction(name, action) {
		return this.callInitAction(name, action).then(success => {
			if(!success) {
				throw _('Command failed');
			};
			return true;
		}).catch(e => {
			ui.addNotification(null,
				E('p', _('Service action failed "%s %s": %s').format(name, action, e)));
		});
	},

	normalizeValue(v) {
		return (v && typeof(v) === 'string') ? v.trim().replace(/\r?\n/g, '') : v;
	},

	makeStatusString(
					app_status_code,
					bllist_preset,
					bllist_module,
					vpn_route_status_code) {
		let app_status_label;
		let spinning = '';

		switch(app_status_code) {
			case 0:
				app_status_label = this.infoLabelRunning;
				break;
			case 2:
				app_status_label = this.infoLabelStopped;
				break;
			case 3:
				app_status_label = this.infoLabelStarting;
				spinning = ' spinning';
				break;
			case 4:
				app_status_label = this.infoLabelUpdating;
				spinning = ' spinning';
				break;
			default:
				app_status_label = this.infoLabelError;
				return E('table', { 'class': 'table' }, [
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td left', 'style': 'width:33%' }, _('Status')),
						E('td', { 'class': 'td left' }, app_status_label),
					]),
				]);
		};

		return E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'style': 'width:33%' }, _('Status')),
				E('td', { 'class': 'td left' + spinning }, [
					app_status_label,
					(app_status_code != 2 && vpn_route_status_code != 0)
						? E('span', { 'class': 'label-status error' },
							_('VPN routing error! Need restart'))
						: '',
				]),
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left' }, _('Blacklist update mode')),
				E('td', { 'class': 'td left' },
					(!bllist_preset || bllist_preset === '') ? _('user entries only') :
						(this.blacklistPresets[bllist_preset]) ?
							[
								E('span', {
									'style'       : 'cursor:help; border-bottom:1px dotted',
									'data-tooltip': this.blacklistPresets[bllist_preset][2],
								}, this.blacklistPresets[bllist_preset][0]),
								' - ',
								this.blacklistPresets[bllist_preset][1],
							]
						:
							_('Error') + '!'
				),
			]),
		]);
	},

	fileEditDialog: baseclass.extend({
		__init__(file, title, description, callback, file_exists=false) {
			this.file        = file;
			this.title       = title;
			this.description = description;
			this.callback    = callback;
			this.file_exists = file_exists;
		},

		load() {
			return L.resolveDefault(fs.read(this.file), '');
		},

		render(content) {
			ui.showModal(this.title, [
				E('div', { 'class': 'cbi-section' }, [
					E('div', { 'class': 'cbi-section-descr' }, this.description),
					E('div', { 'class': 'cbi-section' },
						E('p', {},
							E('textarea', {
								'id'        : 'widget.modal_content',
								'class'     : 'cbi-input-textarea',
								'style'     : 'width:100% !important',
								'rows'      : 10,
								'wrap'      : 'off',
								'spellcheck': 'false',
							},
							content)
						)
					),
				]),
				E('div', { 'class': 'right button-row' }, [
					E('button', {
						'class': 'btn',
						'click': ui.hideModal,
					}, _('Dismiss')),
					' ',
					E('button', {
						'id'   : 'btn_save',
						'class': 'btn cbi-button-positive important',
						'click': ui.createHandlerFn(this, this.handleSave),
					}, _('Save')),
				]),
			]);
		},

		handleSave(ev) {
			let textarea = document.getElementById('widget.modal_content');
			let value    = textarea.value.trim().replace(/\r\n/g, '\n') + '\n';

			return fs.write(this.file, value).then(rc => {
				textarea.value = value;
				ui.addNotification(null, E('p', _('Contents have been saved.')),
					'info');
				if(this.callback) {
					return this.callback(rc);
				};
			}).catch(e => {
				ui.addNotification(null, E('p', _('Unable to save the contents')
					+ ': %s'.format(e.message)));
			}).finally(() => {
				ui.hideModal();
			});
		},

		error(e) {
			if(!this.file_exists && e instanceof Error && e.name === 'NotFoundError') {
				return this.render();
			} else {
				ui.showModal(this.title, [
					E('div', { 'class': 'cbi-section' },
						E('p', {}, _('Unable to read the contents')
							+ ': %s'.format(e.message))
					),
					E('div', { 'class': 'right' },
						E('button', {
							'class': 'btn',
							'click': ui.hideModal,
						}, _('Dismiss'))
					),
				]);
			};
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
});
