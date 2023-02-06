'use strict';
'require fs';
'require form';
'require tools.widgets as widgets';
'require uci';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

return view.extend({
	parsers      : {},

	appStatusCode: null,

	depends      : function(elem, key, array, empty=true) {
		if(empty && array.length === 0) {
			elem.depends(key, '_dummy');
		} else {
			array.forEach(e => elem.depends(key, e));
		};
	},

	validateIpPort: function(section, value) {
		return (/^$|^([0-9]{1,3}\.){3}[0-9]{1,3}(#[\d]{2,5})?$/.test(value)) ? true : _('Expecting:')
			+ ` ${_('One of the following:')}\n - ${_('valid IP address')}\n - ${_('valid address#port')}\n`;
	},

	load: function() {
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

	render: function(data) {
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

		let user_entries_edit = new tools.fileEditDialog(
			tools.userEntriesFile,
			_('User entries'),
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

		let m, s, o;

		m = new form.Map(tools.appName, _('Ruantiblock') + ' - ' + _('Settings'));

		s = m.section(form.NamedSection, 'config');
		s.anonymous = true;
		s.addremove = false;


		/* Main settings tab */

		s.tab('main_settings', _('Main settings'));

		// PROXY_MODE
		o = s.taboption('main_settings', form.ListValue, 'proxy_mode',
			_('Proxy mode'));
		o.value('1', 'Tor');
		o.value('2', 'VPN');
		o.value('3', _('Transparent proxy'));

		// PROXY_LOCAL_CLIENTS
		let proxy_local_clients = s.taboption('main_settings', form.Flag, 'proxy_local_clients',
			_("Apply proxy rules to router application traffic"));
		proxy_local_clients.rmempty = false;

		// ENABLE_LOGGING
		o = s.taboption('main_settings', form.Flag, 'enable_logging',
			_('Logging events'));
		o.rmempty = false;

		// update_at_startup
		o = s.taboption('main_settings', form.Flag, 'update_at_startup',
			_('Update at startup'));
		o.description = _('Update blacklist after system startup');
		o.rmempty = false;

		// NFTSET_CLEAR_SETS
		o = s.taboption('main_settings', form.Flag, 'nftset_clear_sets',
			_('Clean up nftsets before updating blacklist'));
		o.description = _('Reduces RAM consumption during update');
		o.rmempty = false;

		// ALLOWED_HOSTS_MODE
		o = s.taboption('main_settings', form.ListValue, 'allowed_hosts_mode',
			_('Host filter'));
		o.value('0', _('Disabled'));
		o.value('1', _('Only listed hosts'));
		o.value('2', _('All hosts except listed'));
		o.description = _('Restriction of hosts that are allowed to bypass blocking');

		// ALLOWED_HOSTS_LIST
		o = s.taboption('main_settings', form.DynamicList, 'allowed_hosts_list',
			_('IP addresses of hosts'));
		o.datatype = "ip4addr";


		/* Tor tab */

		s.tab('tor_settings', _('Tor mode'));

		// TOR_TRANS_PORT
		o = s.taboption('tor_settings', form.Value, 'tor_trans_port',
			_('Transparent proxy port'));
		o.rmempty  = false;
		o.datatype = "port";

		//TOR_ALLOW_UDP
		o = s.taboption('tor_settings', form.Flag, 'tor_allow_udp',
			_("Send UDP traffic to Tor"));
		o.rmempty = false;

		// ONION_DNS_ADDR
		o = s.taboption('tor_settings', form.Value, 'onion_dns_addr',
			_("Optional DNS resolver for '.onion' zone"), '<code>ipaddress#port</code>');
		o.rmempty  = false;
		o.validate = this.validateIpPort;

		// Torrc edit dialog
		o = s.taboption('tor_settings', form.Button, '_torrc_btn',
			_('Tor configuration file'));
		o.onclick    = () => torrc_edit.show();
		o.inputtitle = _('Edit');
		o.inputstyle = 'edit btn';


		/* VPN tab */

		s.tab('vpn_settings', _('VPN mode'));

		// IF_VPN
		o = s.taboption('vpn_settings', widgets.DeviceSelect, 'if_vpn',
			_('VPN interface'));
		o.multiple  = false;
		o.noaliases = true;
		o.rmempty   = false;
		o.default   = 'tun0';


		/* Proxy tab */

		s.tab('proxy_settings', _('Transparent proxy mode'));

		// T_PROXY_PORT_TCP
		o = s.taboption('proxy_settings', form.Value, 't_proxy_port_tcp',
			_('Transparent proxy TCP port'));
		o.rmempty  = false;
		o.datatype = "port";

		//T_PROXY_ALLOW_UDP
		o = s.taboption('proxy_settings', form.Flag, 't_proxy_allow_udp',
			_("Send UDP traffic to transparent proxy"));
		o.rmempty = false;

		// T_PROXY_PORT_UDP
		o = s.taboption('proxy_settings', form.Value, 't_proxy_port_udp',
			_('Transparent proxy UDP port'));
		o.rmempty  = false;
		o.datatype = "port";


		/* Blacklist module tab */

		s.tab('blacklist_tab', _('Blacklist settings'));

		// BLLIST_PRESET
		let bllist_preset = s.taboption('blacklist_tab', form.ListValue,
			'bllist_preset', _('Blacklist update mode'));
		bllist_preset.description = _("Blacklist sources") + ':';
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
		let bllist_module = s.taboption('blacklist_tab', form.ListValue,
			'bllist_module', _('Blacklist module') + '*');
		bllist_module.value('', _('disabled'));
		bllist_module.depends({ bllist_preset: new RegExp('^($|' + tools.appName + ')'), '!reverse': true });

		Object.entries(this.parsers).forEach(
			e => bllist_module.value(e[1], e[0]));

		if(availableParsers) {
			bllist_preset.description += '<br /> ( * - ' + _('requires installed blacklist module') + ' )';


			/* Parser settings tab */

			s.tab('parser_settings_tab', _('Module settings'));

			// BLLIST_MIN_ENTRIES
			o = s.taboption('parser_settings_tab', form.Value, 'bllist_min_entries',
				_("Minimum allowed number of entries"));
			o.description = _('If less than the specified number of entries are received from the source, then the lists are not updated');
			o.rmempty     = false;
			o.datatype    = 'uinteger';

			// BLLIST_FQDN_FILTER
			o = s.taboption('parser_settings_tab', form.Flag, 'bllist_fqdn_filter',
				_("Enable FQDN filter"));
			o.description = _('Pick domains from blacklist by FQDN filter patterns');
			o.rmempty     = false;

			// BLLIST_FQDN_FILTER_TYPE
			o = s.taboption('parser_settings_tab', form.ListValue, 'bllist_fqdn_filter_type',
				_('FQDN filter type'));
			o.value('0', _('All entries except matching patterns'));
			o.value('1', _('Only entries matching patterns'));

			// BLLIST_FQDN_FILTER_FILE edit dialog
			o = s.taboption('parser_settings_tab', form.Button, '_fqdn_filter_btn',
				_("FQDN filter"));
			o.onclick    = () => fqdn_filter_edit.show();
			o.inputtitle = _('Edit');
			o.inputstyle = 'edit btn';

			// BLLIST_SD_LIMIT
			o = s.taboption('parser_settings_tab', form.Value, 'bllist_sd_limit',
				_("Subdomains limit"));
			o.description = _('The number of subdomains in the domain, upon reaching which the entire 2nd level domain is added to the list');
			o.rmempty     = false;
			o.datatype    = 'uinteger';

			// BLLIST_GR_EXCLUDED_SLD
			o = s.taboption('parser_settings_tab', form.DynamicList, 'bllist_gr_excluded_sld',
				_('2nd level domains that are excluded from optimization'));
			o.description = _('e.g:') + ' <code>livejournal.com</code>';
			o.placeholder = _('e.g:') + ' livejournal.com';
			o.datatype = "hostname";

			// BLLIST_ENABLE_IDN
			o = s.taboption('parser_settings_tab', form.Flag, 'bllist_enable_idn',
				_("Convert cyrillic domains to punycode"));
			o.rmempty = false;

			// BLLIST_ALT_NSLOOKUP
			o = s.taboption('parser_settings_tab', form.Flag, 'bllist_alt_nslookup',
				_('Use optional DNS resolver'));
			o.rmempty = false;

			// BLLIST_ALT_DNS_ADDR
			o = s.taboption('parser_settings_tab', form.Value, 'bllist_alt_dns_addr',
				_("Optional DNS resolver"), '<code>ipaddress[#port]</code>');
			o.rmempty  = false;
			o.validate = this.validateIpPort;

			// BLLIST_IP_FILTER
			o = s.taboption('parser_settings_tab', form.Flag, 'bllist_ip_filter',
				_("Enable IP filter"));
			o.description = _('Pick IP addresses from blacklist by IP filter patterns');
			o.rmempty     = false;

			// BLLIST_IP_FILTER_TYPE
			o = s.taboption('parser_settings_tab', form.ListValue, 'bllist_ip_filter_type',
				_('IP filter type'));
			o.value('0', _('All entries except matching patterns'));
			o.value('1', _('Only entries matching patterns'));

			// BLLIST_IP_FILTER_FILE edit dialog
			o = s.taboption('parser_settings_tab', form.Button, '_ip_filter_btn',
				_("IP filter"));
			o.onclick    = () => ip_filter_edit.show();
			o.inputtitle = _('Edit');
			o.inputstyle = 'edit btn';

			// BLLIST_IP_LIMIT
			o = s.taboption('parser_settings_tab', form.Value, 'bllist_ip_limit', _("IP limit"));
			o.description = _("The number of IP addresses in the subnet, upon reaching which the entire '/24' subnet is added to the list");
			o.rmempty     = false;
			o.datatype    = 'uinteger';

			// BLLIST_GR_EXCLUDED_NETS
			o = s.taboption('parser_settings_tab', form.DynamicList, 'bllist_gr_excluded_nets');
			o.title       = _('IP subnet patterns (/24) that are excluded from optimization');
			o.description = _('e.g:') + ' <code>192.168.1.</code>';
			o.placeholder = _('e.g:') + ' 192.168.1.';
			o.validate = (section, value) => {
				return (/^$|^([0-9]{1,3}[.]){3}$/.test(value)) ? true : _('Expecting:')
						+ ' ' + _('net pattern') + ' (' + _('e.g:') + ' 192.168.3.)\n';
			};

			// BLLIST_SUMMARIZE_IP
			o = s.taboption('parser_settings_tab', form.Flag, 'bllist_summarize_ip',
				_("Summarize IP ranges"));
			o.rmempty = false;

			// BLLIST_SUMMARIZE_CIDR
			o = s.taboption('parser_settings_tab', form.Flag, 'bllist_summarize_cidr',
				_("Summarize '/24' networks"));
			o.rmempty = false;

		};


		/* User entries tab */

		s.tab('user_entries_tab', _('User entries'));

		// ADD_USER_ENTRIES
		o = s.taboption('user_entries_tab', form.Flag, 'add_user_entries',
			_('Enable'), _("Add user entries to the blacklist when updating"));
		o.rmempty = false;
		o.default = 0;
		o.depends({ bllist_preset: '', '!reverse': true });

		// USER_ENTRIES_DNS
		o = s.taboption('user_entries_tab', form.Value, 'user_entries_dns',
			_("DNS server that is used for FQDN entries"), '<code>ipaddress[#port]</code>');
		o.validate = this.validateIpPort;

		// USER_ENTRIES edit dialog
		o = s.taboption('user_entries_tab', form.Button, '_user_entries_btn',
			_('User entries'));
		o.onclick    = () => user_entries_edit.show();
		o.inputtitle = _('Edit');
		o.inputstyle = 'edit btn';

		let map_promise = m.render();
		map_promise.then(node => node.classList.add('fade-in'));
		return map_promise;
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(() => {
			ui.changes.apply(mode == '0');
			if(this.appStatusCode != 1 && this.appStatusCode != 2) {
				window.setTimeout(() => fs.exec(tools.execPath, [ 'restart' ]), 3000);
			};
		});
	},
});
