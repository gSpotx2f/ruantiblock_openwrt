'use strict';
'require fs';
'require form';
'require tools.widgets as widgets';
'require uci';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

return view.extend({
	availableParsers: {},

	appStatusCode   : null,

	depends: function(elem, key, array, empty=true) {
		if(empty && array.length === 0) {
			elem.depends(key, '_dummy');
		} else {
			array.forEach(e => elem.depends(key, e));
		};
	},

	dependsBllistModule: function(elem) {
		this.depends(elem, 'bllist_module', Object.values(this.availableParsers));
	},

	validateIpPort: function(section, value) {
		return (/^$|^([0-9]{1,3}\.){3}[0-9]{1,3}(#[\d]{2,5})?$/.test(value)) ? true : _('Expecting:')
			+ ` ${_('One of the following:')}\n - ${_('valid IP address')}\n - ${_('valid address#port')}\n`;
	},

	load: function() {
		return Promise.all([
			L.resolveDefault(fs.exec(tools.execPath, [ 'raw-status' ]), 1),
			fs.list(tools.parsersDir),
			uci.load('network'),
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
		let p_dir_arr = data[1];
		let vpn_iface = uci.get('network', 'VPN', 'ifname') || 'tun0';

		if(p_dir_arr) {
			p_dir_arr.forEach(e => {
				let fname = e.name;
				if(fname.startsWith('ruab_parser')) {
					this.availableParsers[fname] = tools.parsersDir + '/' + fname;
				};
			});
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
		if(this.appStatusCode == 1 || this.appStatusCode == 2) {
			o = s.taboption('main_settings', form.ListValue, 'proxy_mode',
				_('Proxy mode'));
			o.value('1', 'Tor');
			o.value('2', 'VPN');
		};

		// PROXY_LOCAL_CLIENTS
		let proxy_local_clients = s.taboption('main_settings', form.Flag, 'proxy_local_clients',
			_("Apply proxy rules to router application traffic"));
		proxy_local_clients.rmempty = false;

		// ENABLE_LOGGING
		o = s.taboption('main_settings', form.Flag, 'enable_logging',
			_('Logging events'));
		o.rmempty = false;

		// IPSET_CLEAR_SETS
		o = s.taboption('main_settings', form.Flag, 'ipset_clear_sets',
			_('Clean up ipsets before updating blacklist'));
		o.description = _('Reduces RAM consumption during update');
		o.rmempty = false;

		// ALOWED_HOSTS_MODE
		o = s.taboption('main_settings', form.ListValue, 'alowed_hosts_mode',
			_('Host filter'));
		o.value('0', _('Disabled'));
		o.value('1', _('Only listed hosts'));
		o.value('2', _('All hosts except listed'));
		o.description = _('Restriction of hosts that are allowed to bypass blocking');

		// ALOWED_HOSTS_LIST
		o = s.taboption('main_settings', form.DynamicList, 'alowed_hosts_list',
			_('IP addresses of hosts'));
		o.datatype = "ip4addr";


		if(this.appStatusCode == 1 || this.appStatusCode == 2) {
			/* Tor tab */

			s.tab('tor_settings', _('Tor mode'));

			// TOR_TRANS_PORT
			o = s.taboption('tor_settings', form.Value, 'tor_trans_port',
				_('Transparent proxy port for iptables rules'));
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
			o.default   = vpn_iface;
		};


		/* Parser settings tab */

		s.tab('parser_settings', _('Blacklist settings'));

		// BLLIST_MODULE
		let bllist_module = s.taboption('parser_settings', form.ListValue,
			'bllist_module', _('Blacklist module'));
		bllist_module.value('', _('none (user entries only)'));
		Object.entries(this.availableParsers).forEach(
			e => bllist_module.value(e[1], e[0]));

		// BLLIST_PRESET
		let bllist_preset = s.taboption('parser_settings', form.ListValue,
			'bllist_preset', _('Blacklist update mode'));
		bllist_preset.description = _("Blacklist sources") + ':';
		Object.entries(tools.blacklistPresets).forEach(e => {
			bllist_preset.value(e[0], `${e[1][0]} - ${e[1][1]}`);
		});
		let bllist_sources = {};
		Object.values(tools.blacklistPresets).forEach(v => {bllist_sources[v[0]] = v[2]});
		Object.entries(bllist_sources).forEach(e => {
			bllist_preset.description += `<br />${e[0]} - <a href="${e[1]}" target="_blank">${e[1]}</a>`;
		});

		// BLLIST_IP_LIMIT
		o = s.taboption('parser_settings', form.Value, 'bllist_ip_limit', _("IP limit"));
		o.description = _("The number of IP addresses in the subnet, upon reaching which the entire '/24' subnet is added to the list");
		o.rmempty     = false;
		o.datatype    = 'uinteger';

		// BLLIST_GR_EXCLUDED_NETS
		o = s.taboption('parser_settings', form.DynamicList, 'bllist_gr_excluded_nets');
		o.title       = _('IP subnet patterns (/24) that are excluded from optimization');
		o.description = _('e.g:') + ' <code>192.168.1.</code>';
		o.placeholder = _('e.g:') + ' 192.168.1.';
		o.validate = (section, value) => {
			return (/^$|^([0-9]{1,3}[.]){3}$/.test(value)) ? true : _('Expecting:')
					+ ' ' + _('net pattern') + ' (' + _('e.g:') + ' 192.168.3.)\n';
		};

		// BLLIST_SUMMARIZE_IP
		o = s.taboption('parser_settings', form.Flag, 'bllist_summarize_ip',
			_("Summarize IP ranges"));
		o.rmempty = false;

		// BLLIST_SUMMARIZE_CIDR
		o = s.taboption('parser_settings', form.Flag, 'bllist_summarize_cidr',
			_("Summarize '/24' networks"));
		o.rmempty = false;

		// BLLIST_SD_LIMIT
		o = s.taboption('parser_settings', form.Value, 'bllist_sd_limit',
			_("Subdomains limit"));
		o.description = _('The number of subdomains in the domain, upon reaching which the entire 2nd level domain is added to the list');
		o.rmempty     = false;
		o.datatype    = 'uinteger';

		// BLLIST_GR_EXCLUDED_SLD
		o = s.taboption('parser_settings', form.DynamicList, 'bllist_gr_excluded_sld',
			_('2nd level domains that are excluded from optimization'));
		o.description = _('e.g:') + ' <code>livejournal.com</code>';
		o.placeholder = _('e.g:') + ' livejournal.com';
		o.datatype = "hostname";

		// BLLIST_ENABLE_IDN
		o = s.taboption('parser_settings', form.Flag, 'bllist_enable_idn',
			_("Convert cyrillic domains to punycode"));
		o.rmempty = false;

		// BLLIST_ALT_NSLOOKUP
		o = s.taboption('parser_settings', form.Flag, 'bllist_alt_nslookup',
			_('Use optional DNS resolver'));
		o.rmempty = false;

		// BLLIST_ALT_DNS_ADDR
		o = s.taboption('parser_settings', form.Value, 'bllist_alt_dns_addr',
			_("Optional DNS resolver"), '<code>ipaddress[#port]</code>');
		o.rmempty  = false;
		o.validate = this.validateIpPort;


		/* Blacklist entry filters tab */

		s.tab('entries_filter_tab', _('Blacklist entry filters'));

		// BLLIST_IP_FILTER
		o = s.taboption('entries_filter_tab', form.Flag, 'bllist_ip_filter',
			_("Enable IP filter"));
		o.description = _('Exclude IP addresses from blacklist by IP filter patterns');
		o.rmempty     = false;

		// BLLIST_IP_FILTER_FILE edit dialog
		o = s.taboption('entries_filter_tab', form.Button, '_ip_filter_btn',
			_("IP filter"));
		o.onclick    = () => ip_filter_edit.show();
		o.inputtitle = _('Edit');
		o.inputstyle = 'edit btn';

		// BLLIST_FQDN_FILTER
		o = s.taboption('entries_filter_tab', form.Flag, 'bllist_fqdn_filter',
			_("Enable FQDN filter"));
		o.description = _('Exclude domains from blacklist by FQDN filter patterns');
		o.rmempty     = false;

		// BLLIST_FQDN_FILTER_FILE edit dialog
		o = s.taboption('entries_filter_tab', form.Button, '_fqdn_filter_btn',
			_("FQDN filter"));
		o.onclick    = () => fqdn_filter_edit.show();
		o.inputtitle = _('Edit');
		o.inputstyle = 'edit btn';


		/* User entries tab */

		s.tab('user_entries_tab', _('User entries'));

		// ADD_USER_ENTRIES
		o = s.taboption('user_entries_tab', form.Flag, 'add_user_entries',
			_('Enable'), _("Add user entries to the blacklist when updating"));
		o.rmempty = false;
		o.default = 0;
		this.dependsBllistModule(o);

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
				window.setTimeout(() => tools.handleServiceAction(
					tools.appName, 'restart'), 3000);
			};
		});
	},
});
