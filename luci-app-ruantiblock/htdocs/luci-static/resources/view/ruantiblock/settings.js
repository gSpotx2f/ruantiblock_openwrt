'use strict';
'require fs';
'require form';
'require tools.widgets as widgets';
'require uci';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

return view.extend({
	parsers       : {},

	appStatusCode : null,

	depends(elem, key, array, empty=true) {
		if(empty && array.length === 0) {
			elem.depends(key, '_dummy');
		} else {
			array.forEach(e => elem.depends(key, e));
		};
	},

	validateIpPort(section, value) {
		return (/^$|^([0-9]{1,3}\.){3}[0-9]{1,3}(#[\d]{2,5})?$/.test(value)) ? true : _('Expecting:')
			+ ` ${_('One of the following:')}\n - ${_('valid IP address')}\n - ${_('valid address#port')}\n`;
	},

	validateUrl(section, value) {
		return (/^$|^https?:\/\/[\w.-]+(:[0-9]{2,5})?[\w\/~.&?+=-]*$/.test(value)) ? true : _('Expecting:')
			+ ` ${_('valid URL')}\n`;
	},

	CBIBlockFileEdit: form.Value.extend({
		__name__ : 'CBI.BlockFileEdit',

		__init__(map, section, ctx, id, file, title, description, callback) {
			this.map         = map;
			this.section     = section;
			this.ctx         = ctx;
			this.id          = id,
			this.optional    = true;
			this.rmempty     = true;
			this.file        = file;
			this.title       = title;
			this.description = description;
			this.callback    = callback;
			this.content     = '';
		},

		cfgvalue(section_id, option) {
			return this.content;
		},

		formvalue(section_id) {
			let value    = this.content;
			let textarea = document.getElementById('widget.file_edit.content.' + this.id);
			if(textarea) {
				value = textarea.value.trim().replace(/\r\n/g, '\n') + '\n';
			};
			return value;
		},

		write(section_id, formvalue) {
			return fs.write(this.file, formvalue).then(rc => {
				ui.addNotification(null, E('p', _('Contents have been saved.')),
					'info');
				if(this.callback) {
					return this.callback(rc);
				};
			}).catch(e => {
				ui.addNotification(null, E('p', _('Unable to save the contents')
					+ ': %s'.format(e.message)));
			});
		},

		load() {
			return L.resolveDefault(fs.read(this.file), '').then(c => {
				this.content = c;
			});
		},

		renderWidget(section_id, option_index, cfgvalue) {
			return E('textarea', {
				'id'        : 'widget.file_edit.content.' + this.id,
				'class'     : 'cbi-input-textarea',
				'style'     : 'width:100% !important;resize:vertical !important',
				'rows'      : 10,
				'wrap'      : 'off',
				'spellcheck': 'false',
			}, cfgvalue);
		},
	}),

	load() {
		return Promise.all([
			L.resolveDefault(fs.exec(tools.execPath, [ 'raw-status' ]), 1),
			L.resolveDefault(fs.list(tools.parsersDir), null),
			uci.load(tools.appName),
		]).catch(e => {
			ui.addNotification(null, E('p', _('Unable to read the contents')
				+ ': %s [ %s ]'.format(
					e.message, tools.parsersDir
			)));
		});
	},

	render(data) {
		if(!data) {
			return;
		};
		this.appStatusCode = data[0].code;
		let p_dir_arr      = data[1];
		let curent_module  = uci.get(tools.appName, 'config', 'bllist_module');
		let curent_preset  = uci.get(tools.appName, 'config', 'bllist_preset');

		if(p_dir_arr) {
			p_dir_arr.forEach(e => {
				let fname = e.name;
				if(fname.startsWith('ruab_parser')) {
					this.parsers[fname] = tools.parsersDir + '/' + fname;
				};
			});
		};

		let availableParsers = Object.keys(this.parsers).length > 0;
		if(!availableParsers) {
			for(let i of Object.keys(tools.blacklistPresets)) {
				if(!new RegExp('^($|' + tools.appName + ')').test(i) && i !== curent_preset) {
					delete tools.blacklistPresets[i];
				};
			};
		};

		if(curent_module) {
			this.parsers[curent_module.match(/([^/]*)$/)[0]] = curent_module;
		};

		let ip_filter_edit = new tools.fileEditDialog(
			tools.ipFilterFile,
			_('IP filter'),
			_('Patterns can be strings or regular expressions. Each pattern in a separate line, the symbol <code>#</code> in the first position of the line - comments on the line.<br />Examples (dot is a special character):') +
				'<br /><code>128[.]199[.]0[.]0/16<br />34[.]217[.]90[.]52<br />162[.]13[.]190[.]</code>'
		);

		let fqdn_filter_edit = new tools.fileEditDialog(
			tools.fqdnFilterFile,
			_('FQDN filter'),
			_('Patterns can be strings or regular expressions. Each pattern in a separate line, the symbol <code>#</code> in the first position of the line - comments on the line.<br />Examples:') +
				'<br /><code>poker<br />[ck]?a[sz]ino?<br />[vw]ulkan<br />slots?</code>'
		);

		let bypass_entries_edit = new tools.fileEditDialog(
			tools.bypassEntriesFile,
			_('Exclusion list'),
			_('One entry (IP, CIDR or FQDN) per line. In the FQDN records, you can specify the DNS server for resolving this domain (separated by a space). You can also comment on lines (<code>#</code> is the first character of a line).<br />Examples:') +
				'<br /><code>#comment<br />domain.net<br />sub.domain.com 8.8.8.8<br />sub.domain.com 8.8.8.8#53<br />74.125.131.19<br />74.125.0.0/16</code>'
		);

		let torrc_edit = new tools.fileEditDialog(
			tools.torrcFile,
			_('Tor configuration file'),
			null,
			function(rc) {
				return tools.getInitStatus('tor').then(res => {
					if(res) {
						return tools.handleServiceAction('tor', 'restart');
					};
				});
			}
		);

		let gr_excluded_nets_edit = new tools.fileEditDialog(
			tools.grExcludedNetsFile,
			_('IP subnet patterns (/24) that are excluded from optimization'),
			_('One IP subnet pattern (/24) per line. You can also comment on lines (<code>#</code> is the first character of a line).<br />Examples:') +
				'<br /><code>#comment<br />74.125.131.<br />74.125.0.</code>'
		);

		let gr_excluded_sld_edit = new tools.fileEditDialog(
			tools.grExcludedSldFile,
			_('2nd level domains that are excluded from optimization'),
			_('One FQDN entry per line. You can also comment on lines (<code>#</code> is the first character of a line).<br />Examples:') +
				'<br /><code>#comment<br />domain.net<br />anotherdomain.com</code>'
		);

		let m, s, o, ss;

		m = new form.Map(tools.appName, _('Ruantiblock') + ' - ' + _('Settings'));

		s = m.section(form.NamedSection, 'config');
		s.anonymous = true;
		s.addremove = false;


		/* General settings tab */

		s.tab('general_tab', _('General settings'));

		// ENABLE_LOGGING
		o = s.taboption('general_tab', form.Flag, 'enable_logging',
			_('Logging events'));
		o.rmempty = false;

		// update_at_startup
		o = s.taboption('general_tab', form.Flag, 'update_at_startup',
			_('Update at startup'));
		o.description = _('Update blacklist after system startup');
		o.rmempty = false;

		// PROXY_LOCAL_CLIENTS
		o = s.taboption('general_tab', form.Flag, 'proxy_local_clients',
			_('Apply proxy rules to router application traffic'));
		o.rmempty = false;

		// NFTSET_CLEAR_SETS
		o = s.taboption('general_tab', form.Flag, 'nftset_clear_sets',
			_('Clean up nftsets before updating blacklist'));
		o.description = _('Reduces RAM consumption during update');
		o.rmempty = false;

		// ALLOWED_HOSTS_MODE
		o = s.taboption('general_tab', form.ListValue, 'allowed_hosts_mode',
			_('Host filter'));
		o.value('0', _('Disabled'));
		o.value('1', _('Only listed hosts'));
		o.value('2', _('All hosts except listed'));
		o.description = _('Restriction the local network hosts that are allowed to bypass blocking');

		// ALLOWED_HOSTS_LIST
		o = s.taboption('general_tab', form.DynamicList, 'allowed_hosts_list',
			_('IP addresses for host filter'));
		o.datatype = 'ip4addr';

		// ENABLE_TMP_DOWNLOADS
		o = s.taboption('general_tab', form.Flag, 'enable_tmp_downloads',
			_('Safe blacklist update'),
			_('If update fails, the old blacklist configuration will be retained. Temporary files are used, when updating the blacklist (increases memory consumption).'));
		o.rmempty = false;
		o.default = 0;

		// BYPASS_MODE
		o = s.taboption('general_tab', form.Flag, 'bypass_mode',
			_('Enable exclusion list'), _('List of hosts that are excluded from block bypass (always available directly)'));
		o.rmempty = false;
		o.default = 0;

		// BYPASS_ENTRIES edit dialog
		o = s.taboption('general_tab', form.Button, '_bypass_entries_btn',
			_('Exclusion list'));
		o.onclick    = () => bypass_entries_edit.show();
		o.inputtitle = _('Edit');
		o.inputstyle = 'edit btn';

		// BYPASS_ENTRIES_DNS
		o = s.taboption('general_tab', form.Value, 'bypass_entries_dns',
			_('DNS server that is used for the FQDN entries of exclusion list'), '<code>ipaddress[#port]</code>');
		o.validate = this.validateIpPort;


		/* Main blacklist tab */

		s.tab('main_blacklist_tab', _('Main blacklist'));

		o = s.taboption('main_blacklist_tab', form.SectionValue, 'config', form.NamedSection,
			'config');
		s.anonymous = true;
		s.addremove = false;
		ss = o.subsection;


		/* Main settings tab */

		ss.tab('b_settings_tab', _('Main settings'));

		// PROXY_MODE
		o = ss.taboption('b_settings_tab', form.ListValue, 'proxy_mode',
			_('Proxy mode'));
		o.value('1', 'Tor');
		o.value('2', 'VPN');
		o.value('3', _('Transparent proxy'));
		o.default = tools.defaultConfig.proxy_mode;

		// BLLIST_PRESET
		let bllist_preset = ss.taboption('b_settings_tab', form.ListValue,
			'bllist_preset', _('Blacklist update mode'));
		bllist_preset.description = _('Blacklist sources') + ':';
		bllist_preset.value('', _('user entries only'));
		Object.entries(tools.blacklistPresets).forEach(e => {
			bllist_preset.value(e[0], ((e[1][1]) ? `${e[1][0]} - ${e[1][1]}` : e[1][0]));
		});
		let bllist_sources = {};
		Object.values(tools.blacklistPresets).forEach(v => { bllist_sources[v[0]] = v[2] });
		Object.entries(bllist_sources).forEach(e => {
			if(e[1]) {
				bllist_preset.description += `<br />${e[0]} - <a href="${e[1]}" target="_blank">${e[1]}</a>`;
			};
		});

		// BLLIST_MODULE
		let bllist_module = ss.taboption('b_settings_tab', form.ListValue,
			'bllist_module', _('Blacklist module') + '*');
		bllist_module.value('', _('disabled'));
		bllist_module.depends({ bllist_preset: new RegExp('^($|' + tools.appName + ')'), '!reverse': true });

		Object.entries(this.parsers).forEach(
			e => bllist_module.value(e[1], e[0]));

		// ENABLE_FPROXY
		o = ss.taboption('b_settings_tab', form.Flag, 'enable_fproxy',
			_('Enable full proxy mode'));
		o.description = _('All traffic of the specified hosts passes through the proxy, without a blacklist');
		o.rmempty = false;
		o.default = 0;

		// FPROXY_LIST
		o = ss.taboption('b_settings_tab', form.DynamicList, 'fproxy_list',
			_('IP addresses for full proxy mode'));
		o.datatype = 'ip4addr';

		// ENABLE_BLLIST_PROXY
		o = ss.taboption('b_settings_tab', form.Flag, 'enable_bllist_proxy',
			_('Downloading a blacklist via proxy'), _('Turn on if blacklist source is blocked'));
		o.rmempty = false;
		o.default = 0;


		/* Tor tab */

		ss.tab('b_tor_tab', _('Tor mode'));

		// TOR_TRANS_PORT
		o = ss.taboption('b_tor_tab', form.Value, 'tor_trans_port',
			_('Transparent proxy port'));
		o.rmempty  = false;
		o.default  = tools.defaultConfig.tor_trans_port;
		o.datatype = 'port';

		// ONION_DNS_ADDR
		o = ss.taboption('b_tor_tab', form.Value, 'onion_dns_addr',
			_("Optional DNS resolver for '.onion' zone"), '<code>ipaddress#port</code>');
		o.rmempty  = false;
		o.default  = tools.defaultConfig.onion_dns_addr;
		o.validate = this.validateIpPort;

		// Torrc edit dialog
		o = ss.taboption('b_tor_tab', form.Button, '_torrc_btn',
			_('Tor configuration file'));
		o.onclick    = () => torrc_edit.show();
		o.inputtitle = _('Edit');
		o.inputstyle = 'edit btn';


		/* VPN tab */

		ss.tab('b_vpn_tab', _('VPN mode'));

		// IF_VPN
		o = ss.taboption('b_vpn_tab', widgets.DeviceSelect, 'if_vpn',
			_('VPN interface'));
		o.multiple  = false;
		o.noaliases = true;
		o.rmempty   = false;
		o.default  = tools.defaultConfig.if_vpn;

		// VPN_GW_IP
		o = ss.taboption('b_vpn_tab', form.Value, 'vpn_gw_ip',
			_('VPN gateway IP address'),
			_('If not specified, the VPN interface address is used (or peer address for PPP protocols)'));
		o.datatype = 'ip4addr(1)';


		/* Tproxy tab */

		ss.tab('b_tproxy_tab', _('Transparent proxy mode'));

		// T_PROXY_TYPE
		o = ss.taboption('b_tproxy_tab', form.ListValue, 't_proxy_type',
			_('Proxy type'));
		o.value('0', _('redirect'));
		o.value('1', _('tproxy'));
		o.description = _('Statement in nftables rules');

		// T_PROXY_PORT_TCP
		o = ss.taboption('b_tproxy_tab', form.Value, 't_proxy_port_tcp',
			_('Transparent proxy TCP port'));
		o.rmempty  = false;
		o.default  = tools.defaultConfig.t_proxy_port_tcp;
		o.datatype = 'port';

		// T_PROXY_ALLOW_UDP
		o = ss.taboption('b_tproxy_tab', form.Flag, 't_proxy_allow_udp',
			_('Send UDP traffic to transparent proxy'));
		o.rmempty = false;
		o.default = 0;

		// T_PROXY_PORT_UDP
		o = ss.taboption('b_tproxy_tab', form.Value, 't_proxy_port_udp',
			_('Transparent proxy UDP port'));
		o.rmempty  = false;
		o.default  = tools.defaultConfig.t_proxy_port_udp;
		o.datatype = 'port';

		if(availableParsers) {
			bllist_preset.description += '<br /> ( * - ' + _('requires installed blacklist module') + ' )';


			/* Parser settings tab */

			ss.tab('b_parser_settings_tab', _('Module settings'));

			// BLLIST_MIN_ENTRIES
			o = ss.taboption('b_parser_settings_tab', form.Value, 'bllist_min_entries',
				_('Minimum allowed number of entries'));
			o.description = _('If less than the specified number of entries are received from the source, then the lists are not updated');
			o.rmempty     = false;
			o.datatype    = 'uinteger';

			// BLLIST_FQDN_FILTER
			o = ss.taboption('b_parser_settings_tab', form.Flag, 'bllist_fqdn_filter',
				_('Enable FQDN filter'));
			o.description = _('Pick domains from blacklist by FQDN filter patterns');
			o.rmempty     = false;

			// BLLIST_FQDN_FILTER_TYPE
			o = ss.taboption('b_parser_settings_tab', form.ListValue, 'bllist_fqdn_filter_type',
				_('FQDN filter type'));
			o.value('0', _('All entries except matching patterns'));
			o.value('1', _('Only entries matching patterns'));

			// BLLIST_FQDN_FILTER_FILE edit dialog
			o = ss.taboption('b_parser_settings_tab', form.Button, '_fqdn_filter_btn',
				_('FQDN filter'));
			o.onclick    = () => fqdn_filter_edit.show();
			o.inputtitle = _('Edit');
			o.inputstyle = 'edit btn';

			// BLLIST_SD_LIMIT
			o = ss.taboption('b_parser_settings_tab', form.Value, 'bllist_sd_limit',
				_('Subdomains limit'));
			o.description = _('The number of subdomains in the domain, upon reaching which the entire 2nd level domain is added to the list');
			o.rmempty     = false;
			o.datatype    = 'uinteger';

			// BLLIST_GR_EXCLUDED_SLD_FILE edit dialog
			o = ss.taboption('b_parser_settings_tab', form.Button, '_gr_excluded_sld_btn',
				_('2nd level domains that are excluded from optimization'));
			o.onclick    = () => gr_excluded_sld_edit.show();
			o.inputtitle = _('Edit');
			o.inputstyle = 'edit btn';

			// BLLIST_ENABLE_IDN
			o = ss.taboption('b_parser_settings_tab', form.Flag, 'bllist_enable_idn',
				_('Convert cyrillic domains to punycode'));
			o.rmempty = false;

			// BLLIST_ALT_NSLOOKUP
			o = ss.taboption('b_parser_settings_tab', form.Flag, 'bllist_alt_nslookup',
				_('Use optional DNS resolver'));
			o.rmempty = false;

			// BLLIST_ALT_DNS_ADDR
			o = ss.taboption('b_parser_settings_tab', form.Value, 'bllist_alt_dns_addr',
				_('Optional DNS resolver'), '<code>ipaddress[#port]</code>');
			o.rmempty  = false;
			o.validate = this.validateIpPort;

			// BLLIST_IP_FILTER
			o = ss.taboption('b_parser_settings_tab', form.Flag, 'bllist_ip_filter',
				_('Enable IP filter'));
			o.description = _('Pick IP addresses from blacklist by IP filter patterns');
			o.rmempty     = false;

			// BLLIST_IP_FILTER_TYPE
			o = ss.taboption('b_parser_settings_tab', form.ListValue, 'bllist_ip_filter_type',
				_('IP filter type'));
			o.value('0', _('All entries except matching patterns'));
			o.value('1', _('Only entries matching patterns'));

			// BLLIST_IP_FILTER_FILE edit dialog
			o = ss.taboption('b_parser_settings_tab', form.Button, '_ip_filter_btn',
				_('IP filter'));
			o.onclick    = () => ip_filter_edit.show();
			o.inputtitle = _('Edit');
			o.inputstyle = 'edit btn';

			// BLLIST_IP_LIMIT
			o = ss.taboption('b_parser_settings_tab', form.Value, 'bllist_ip_limit', _('IP limit'));
			o.description = _("The number of IP addresses in the subnet, upon reaching which the entire '/24' subnet is added to the list");
			o.rmempty     = false;
			o.datatype    = 'uinteger';

			// BLLIST_GR_EXCLUDED_NETS_FILE edit dialog
			o = ss.taboption('b_parser_settings_tab', form.Button, '_gr_excluded_nets_btn',
				_('IP subnet patterns (/24) that are excluded from optimization'));
			o.onclick    = () => gr_excluded_nets_edit.show();
			o.inputtitle = _('Edit');
			o.inputstyle = 'edit btn';

			// BLLIST_SUMMARIZE_IP
			o = ss.taboption('b_parser_settings_tab', form.Flag, 'bllist_summarize_ip',
				_('Summarize IP ranges'));
			o.rmempty = false;

			// BLLIST_SUMMARIZE_CIDR
			o = ss.taboption('b_parser_settings_tab', form.Flag, 'bllist_summarize_cidr',
				_("Summarize '/24' networks"));
			o.rmempty = false;
		};


		/* User entries tab */

		s.tab('user_entries_tab', _('User entries'));

		o = s.taboption('user_entries_tab', form.SectionValue, 'user_instance', form.GridSection,
			'user_instance');
		ss = o.subsection;
		ss.addremove      = false;
		ss.sortable       = false;
		ss.nodescriptions = true;
		ss.modaltitle     = `${_('User entries')} - %s`;
		ss.max_cols       = 2;


		/* User entries main settings tab */

		ss.tab('u_main_tab', _('Main settings'));

		// description
		o = ss.taboption('u_main_tab', form.Value, 'u_description',
			_("Description"));
		o.datatype  = 'maxlength(50)';
		o.modalonly = null;

		// U_ENABLED
		o = ss.taboption('u_main_tab', form.Flag, 'u_enabled',
			_('Enabled'),
		);
		o.rmempty   = false;
		o.default   = 1;
		o.editable  = true;
		o.modalonly = false;

		// U_PROXY_MODE
		o = ss.taboption('u_main_tab', form.ListValue, 'u_proxy_mode',
			_('Proxy mode'));
		o.value('1', 'Tor');
		o.value('2', 'VPN');
		o.value('3', _('Transparent proxy'));
		o.default   = tools.defaultConfig.proxy_mode;
		o.modalonly = true;

		// U_ENABLE_FPROXY
		o = ss.taboption('u_main_tab', form.Flag, 'u_enable_fproxy',
			_('Enable full proxy mode'));
		o.description = _('All traffic of the specified hosts passes through the proxy, without a blacklist');
		o.rmempty   = false;
		o.default   = 0;
		o.modalonly = true;

		// U_FPROXY_LIST
		o = ss.taboption('u_main_tab', form.DynamicList, 'u_fproxy_list',
			_('IP addresses for full proxy mode'));
		o.datatype  = 'ip4addr';
		o.modalonly = true;


		/* User entries tor tab */

		ss.tab('u_tor_tab', _('Tor mode'));

		// U_TOR_TRANS_PORT
		o = ss.taboption('u_tor_tab', form.Value, 'u_tor_trans_port',
			_('Transparent proxy port'));
		o.rmempty   = false;
		o.default   = tools.defaultConfig.tor_trans_port;
		o.datatype  = 'port';
		o.modalonly = true;

		// U_ONION_DNS_ADDR
		o = ss.taboption('u_tor_tab', form.Value, 'u_onion_dns_addr',
			_("Optional DNS resolver for '.onion' zone"), '<code>ipaddress#port</code>');
		o.rmempty   = false;
		o.default   = tools.defaultConfig.onion_dns_addr;
		o.validate  = this.validateIpPort;
		o.modalonly = true;

		/* User entries VPN tab */

		ss.tab('u_vpn_tab', _('VPN mode'));

		// U_IF_VPN
		o = ss.taboption('u_vpn_tab', widgets.DeviceSelect, 'u_if_vpn',
			_('VPN interface'));
		o.multiple  = false;
		o.noaliases = true;
		o.rmempty   = false;
		o.default   = tools.defaultConfig.if_vpn;
		o.modalonly = true;

		// U_VPN_GW_IP
		o = ss.taboption('u_vpn_tab', form.Value, 'u_vpn_gw_ip',
			_('VPN gateway IP address'),
			_('If not specified, the VPN interface address is used (or peer address for PPP protocols)'));
		o.datatype  = 'ip4addr(1)';
		o.modalonly = true;


		/* User entries tproxy tab */

		ss.tab('u_tproxy_tab', _('Transparent proxy mode'));

		// U_T_PROXY_TYPE
		o = ss.taboption('u_tproxy_tab', form.ListValue, 'u_t_proxy_type',
			_('Proxy type'));
		o.value('0', _('redirect'));
		o.value('1', _('tproxy'));
		o.description = _('Statement in nftables rules');
		o.modalonly   = true;

		// U_T_PROXY_PORT_TCP
		o = ss.taboption('u_tproxy_tab', form.Value, 'u_t_proxy_port_tcp',
			_('Transparent proxy TCP port'));
		o.rmempty   = false;
		o.default   = tools.defaultConfig.t_proxy_port_tcp;
		o.datatype  = 'port';
		o.modalonly = true;

		// U_T_PROXY_ALLOW_UDP
		o = ss.taboption('u_tproxy_tab', form.Flag, 'u_t_proxy_allow_udp',
			_('Send UDP traffic to transparent proxy'));
		o.rmempty   = false;
		o.default   = 0;
		o.modalonly = true;

		// U_T_PROXY_PORT_UDP
		o = ss.taboption('u_tproxy_tab', form.Value, 'u_t_proxy_port_udp',
			_('Transparent proxy UDP port'));
		o.rmempty   = false;
		o.default   = tools.defaultConfig.t_proxy_port_udp;
		o.datatype  = 'port';
		o.modalonly = true;


		/* User entries items tab */

		ss.tab('u_entries_tab', _('Entries'));

		ss.addModalOptions = (s, section_id, ev) => {

			// user entries edit dialog
			o = s.taboption('u_entries_tab', this.CBIBlockFileEdit, this,
				'user-entries',
				tools.userListsDir + '/' + s.section,
				_('Edit entries'),
				_('One entry (IP, CIDR or FQDN) per line. In the FQDN records, you can specify the DNS server for resolving this domain (separated by a space). You can also comment on lines (<code>#</code> is the first character of a line).<br />Examples:') +
				'<br /><code>#comment<br />domain.net<br />sub.domain.com 8.8.8.8<br />sub.domain.com 8.8.8.8#53<br />74.125.131.19<br />74.125.0.0/16</code>'
			);

			o.modalonly = true;

			// U_ENTRIES_REMOTE
			o = s.taboption('u_entries_tab', form.DynamicList, 'u_entries_remote',
				_('URLs of remote user entries file'));
			o.validate  = this.validateUrl;
			o.modalonly = true;

			// U_ENABLE_ENTRIES_REMOTE_PROXY
			o = s.taboption('u_entries_tab', form.Flag, 'u_enable_entries_remote_proxy',
				_('Downloading files via proxy'), _('Turn on if files are blocked'));
			o.rmempty = false;
			o.default = 0;

			// U_ENTRIES_DNS
			o = s.taboption('u_entries_tab', form.Value, 'u_entries_dns',
				_("DNS server that is used for the user's FQDN entries"), '<code>ipaddress[#port]</code>');
			o.validate  = this.validateIpPort;
			o.modalonly = true;
		};

		let map_promise = m.render();
		map_promise.then(node => node.classList.add('fade-in'));

		return map_promise;
	},

	handleSave(ev, restart) {
		let tasks = [];
		document.getElementById('maincontent')
			.querySelectorAll('.cbi-map').forEach((map, i, a) => {
				let res = DOM.callClassMethod(map, 'save');
				if(restart && i == a.length - 1 && this.appStatusCode != 1 && this.appStatusCode != 2) {
					res.then(() => {
						window.setTimeout(() => {
							fs.exec_direct(tools.execPath, [ 'restart' ]).then(
								() => console.log(tools.execPath + ' restarted...')
							);
						}, 2000);
					});
				};
				tasks.push(res);
			});
		return Promise.all(tasks);
	},

	handleSaveApply(ev, mode) {
		return this.handleSave(ev, true).then(() => {
			ui.changes.apply(mode == '0');
		});
	},
});
