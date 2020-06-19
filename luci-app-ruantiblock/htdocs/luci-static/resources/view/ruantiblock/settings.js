'use strict';
'require fs';
'require uci';
'require form';
'require ui';
'require tools.widgets as widgets';
'require view.ruantiblock.tools as tools';

let available_parsers = [];

function depends(elem, key, array, empty=true) {
    if(empty && array.length === 0) {
        elem.depends(key, '_dummy');
    } else {
        array.forEach(e => elem.depends(key, e));
    };
};

function depends_bllist_module(elem) {
    depends(elem, 'bllist_module', available_parsers);
};

function validate_ip_port(section, value) {
    return (/^$|^([0-9]{1,3}\.){3}[0-9]{1,3}(#[\d]{2,5})?$/.test(value)) ? true : _('Expecting:')
        + ` ${_('One of the following:')}\n - ${_('valid IP address')}\n - ${_('valid address#port')}\n`;
};

let CBIBlockTitle = form.DummyValue.extend({
    string: null,

    renderWidget: function(section_id, option_index, cfgvalue) {
        this.title = this.description = null;
        return E([
            E('label', { 'class': 'cbi-value-title' }),
            E('div', { 'class': 'cbi-value-field' },
                E('b', {}, this.string)
            ),
        ]);
    },
});

let ip_filter_edit = new tools.file_edit_dialog(
    tools.ip_filter_file,
    _('IP filter'),
    _('Patterns can be strings or regular expressions. Each pattern in a separate line, the symbol <code>#</code> in the first position of the line - comments on the line.<br />Examples (dot is a special character):') + '<br /><code>128[.]199[.]0[.]0/16<br />34[.]217[.]90[.]52<br />162[.]13[.]190[.]</code>'
);

let fqdn_filter_edit = new tools.file_edit_dialog(
    tools.fqdn_filter_file,
    _('FQDN filter'),
    _('Patterns can be strings or regular expressions. Each pattern in a separate line, the symbol <code>#</code> in the first position of the line - comments on the line.<br />Examples:') + '<br /><code>poker<br />[ck]?a[sz]ino?<br />[vw]ulkan<br />slots?</code>'
);

let user_entries_edit = new tools.file_edit_dialog(
    tools.user_entries_file,
    _('User entries'),
    _('One entry (IP, CIDR or FQDN) per line. In the FQDN records, you can specify the DNS server for resolving this domain (separated by a space). You can also comment on lines (<code>#</code> is the first character of a line).<br />Examples:') + '<br /><code>#comment<br />domain.net<br />sub.domain.com 8.8.8.8<br />sub.domain.com 8.8.8.8#53<br />74.125.131.19<br />74.125.0.0/16</code>'
);

let torrc_edit = new tools.file_edit_dialog(
    tools.torrc_file,
    _('Tor configuration file'),
    null,
    function(rc) {
        return fs.exec('/etc/init.d/tor', [ 'enabled' ]).then(res => {
            if(res.code === 0) {
                return fs.exec('/etc/init.d/tor', [ 'restart' ]);
            };
        }).catch(e => {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s<br />[ %s ]'.format(e.message, '/etc/init.d/tor')));
        });
    }
);

return L.view.extend({
    app_status_code: null,

    load: function() {
        return Promise.all([
            L.resolveDefault(fs.exec(tools.exec_path, [ 'raw-status' ]), 1),
            fs.list(tools.parsers_dir),
            uci.load('network'),
        ]).catch(e => {
            ui.addNotification(null, E('p', _('Unable to read the contents')
                + ': %s<br />[ %s ]'.format(
                    e.message, tools.parsers_dir
            )));
        });
    },

    render: function(data) {
        if(!data) {
            return;
        };
        this.app_status_code = data[0].code;
        let p_dir_arr = data[1];
        let lan_iface = uci.get('network', 'lan', 'ifname') || 'eth0';
        let vpn_iface = uci.get('network', 'VPN', 'ifname') || 'tun0';

        if(p_dir_arr) {
            p_dir_arr.forEach(e => {
                let fname = e.name;
                if(fname.startsWith('ruab_parser')) {
                    available_parsers.push(tools.parsers_dir + '/' + fname);
                };
            });
        };

        let m, s, o;

        m = new form.Map(tools.app_name, _('Ruantiblock') + ' - ' + _('Settings'));

        s = m.section(form.NamedSection, 'config');
        s.anonymous = true;
        s.addremove = false;

        /* Main settings tab */

        s.tab('main_settings', _('Main settings'));

        // PROXY_MODE
        if(this.app_status_code == 1 || this.app_status_code == 2) {
            o = s.taboption('main_settings', form.ListValue, 'proxy_mode',
                _('Proxy mode'));
            o.value('1', 'Tor');
            o.value('2', 'VPN');
        };

        // PROXY_LOCAL_CLIENTS
        let proxy_local_clients = s.taboption('main_settings', form.Flag, 'proxy_local_clients',
            _("Apply proxy rules to router application traffic"));
        proxy_local_clients.rmempty = false;
        proxy_local_clients.default = proxy_local_clients.enabled;

        // USE_LOGGER
        o = s.taboption('main_settings', form.Flag, 'use_logger',
            _('Logging events'));
        o.rmempty = false;
        o.default = 1;

        // DEF_TOTAL_PROXY
        o = s.taboption('main_settings', form.Flag, 'def_total_proxy',
            _("Enable the 'total-proxy' option at startup"));
        o.rmempty = false;
        o.default = 0;
        o.depends('proxy_local_clients', '0');

        // IPSET_CLEAR_SETS
        o = s.taboption('main_settings', form.Flag, 'ipset_clear_sets',
            _('Clean up ipsets before updating blacklist'));
        o.description = _('Reduces RAM consumption during update');
        o.rmempty = false;
        o.default = 0;


        if(this.app_status_code == 1 || this.app_status_code == 2) {
            /* Tor tab */

            s.tab('tor_settings', _('Tor mode'));

            // IF_LAN
            o = s.taboption('tor_settings', widgets.DeviceSelect, 'if_lan',
                _('LAN interface'));
            o.multiple = false;
            o.noaliases = true;
            o.rmempty = false;
            o.default = lan_iface;

            // TOR_TRANS_PORT
            o = s.taboption('tor_settings', form.Value, 'tor_trans_port',
                _('Transparent proxy port for iptables rules'));
            o.rmempty = false;
            o.datatype = "port";
            o.default = '9040';

            // ONION_DNS_ADDR
            o = s.taboption('tor_settings', form.Value, 'onion_dns_addr',
                _("Optional DNS resolver for '.onion' zone"), '<code>ipaddress#port</code>');
            o.rmempty = false;
            o.default = '127.0.0.1#9053';
            o.validate = validate_ip_port;

            // Torrc edit dialog
            o = s.taboption('tor_settings', form.Button, '_torrc_btn',
                _('Tor configuration file'));
            o.onclick = () => torrc_edit.show();
            o.inputtitle = _('Edit');
            o.inputstyle = 'edit btn';


            /* VPN tab */

            s.tab('vpn_settings', _('VPN mode'));

            // IF_VPN
            o = s.taboption('vpn_settings', widgets.DeviceSelect, 'if_vpn',
                _('VPN interface'));
            o.multiple = false;
            o.noaliases = true;
            o.rmempty = false;
            o.default = vpn_iface;
        };


        /* Parser settings tab */

        s.tab('parser_settings', _('Blacklist settings'));

        // BLLIST_MODULE
        let bllist_module = s.taboption('parser_settings', form.ListValue,
            'bllist_module', _('Blacklist module'));
        bllist_module.value("", _("user entries only"));
        available_parsers.forEach(e => bllist_module.value(e));

        // BLLIST_MODE
        let bllist_mode = s.taboption('parser_settings', form.ListValue,
            'bllist_mode', _('Module operation mode'));
        bllist_mode.value('ip');
        bllist_mode.value('fqdn');
        depends_bllist_module(bllist_mode);

        // BLLIST_SOURCE
        let bllist_source = s.taboption('parser_settings', form.ListValue,
            'bllist_source', _('Blacklist source'));
        bllist_source.description = _("Options") + ':';
        for(let [k, v] of Object.entries(tools.blacklist_sources)) {
            bllist_source.value(k);
            bllist_source.description += `<br />${k} - <a href="${v}" target="_blank">${v}</a>`;
        };
        depends_bllist_module(bllist_source);

        o = s.taboption('parser_settings', CBIBlockTitle, '_dummy_ip');
        o.string = _('IP configuration') + ':';
        depends_bllist_module(o);

        // IP_LIMIT
        o = s.taboption('parser_settings', form.Value, 'ip_limit', _("IP limit"));
        o.description = _("The number of IP addresses in the subnet, upon reaching which the entire '/24' subnet is added to the list");
        o.datatype = 'uinteger';
        o.default = '0';
        depends_bllist_module(o);

        // OPT_EXCLUDE_NETS
        o = s.taboption('parser_settings', form.DynamicList, 'opt_exclude_nets');
        o.title = _('IP subnet patterns (/24) that are excluded from optimization');
        o.description = _('ex:') + ' <code>192.168.1.</code>';
        o.placeholder = _('ex:') + ' 192.168.1.';
        o.default = '';
        depends_bllist_module(o);

        // SUMMARIZE_IP
        o = s.taboption('parser_settings', form.Flag, 'summarize_ip',
            _("Summarize IP ranges"));
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        // SUMMARIZE_CIDR
        o = s.taboption('parser_settings', form.Flag, 'summarize_cidr',
            _("Summarize '/24' networks"));
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        o = s.taboption('parser_settings', CBIBlockTitle, '_dummy_fqdn');
        o.string = _('FQDN configuration') + ':';
        depends_bllist_module(o);

        // SD_LIMIT
        o = s.taboption('parser_settings', form.Value, 'sd_limit',
            _("Subdomains limit"));
        o.description = _('The number of subdomains in the domain, upon reaching which the entire 2nd level domain is added to the list');
        o.datatype = 'uinteger';
        o.default = '16';
        depends_bllist_module(o);

        // OPT_EXCLUDE_SLD
        o = s.taboption('parser_settings', form.DynamicList, 'opt_exclude_sld',
            _('2nd level domains that are excluded from optimization'));
        o.datatype = "hostname";
        o.default = [
            'livejournal.com',
            'facebook.com',
            'vk.com',
            'blog.jp',
            'msk.ru',
            'net.ru',
            'org.ru',
            'net.ua',
            'com.ua',
            'org.ua',
            'co.uk',
            'amazonaws.com',
        ];
        depends_bllist_module(o);

        // USE_IDN
        o = s.taboption('parser_settings', form.Flag, 'use_idn',
            _("Convert cyrillic domains to punycode"));
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        // ALT_NSLOOKUP
        o = s.taboption('parser_settings', form.Flag, 'alt_nslookup',
            _('Use optional DNS resolver'));
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        // ALT_DNS_ADDR
        o = s.taboption('parser_settings', form.Value, 'alt_dns_addr',
            _("Optional DNS resolver"), '<code>ipaddress[#port]</code>');
        o.rmempty = false;
        o.depends('alt_nslookup', '1');
        o.validate = validate_ip_port;
        o.default = '8.8.8.8';


        /* Entries filters tab */

        s.tab('entries_filter_tab', _('Entries filters'));

        // IP_FILTER
        o = s.taboption('entries_filter_tab', form.Flag, 'ip_filter',
            _("Enable IP filter"));
        o.description = _('Exclude IP addresses from blacklist by IP filter patterns');
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        // IP_FILTER edit dialog
        o = s.taboption('entries_filter_tab', form.Button, '_ip_filter_btn',
            _("IP filter"));
        o.onclick = () => ip_filter_edit.show();
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        depends_bllist_module(o);

        // FQDN_FILTER
        o = s.taboption('entries_filter_tab', form.Flag, 'fqdn_filter',
            _("Enable FQDN filter"));
        o.description = _('Exclude domains from blacklist by FQDN filter patterns');
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        // FQDN_FILTER edit dialog
        o = s.taboption('entries_filter_tab', form.Button, '_fqdn_filter_btn',
            _("FQDN filter"));
        o.onclick = () => fqdn_filter_edit.show();
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        depends_bllist_module(o);


        /* User entries tab */

        s.tab('user_entries_tab', _('User entries'));

        // ADD_USER_ENTRIES
        o = s.taboption('user_entries_tab', form.Flag, 'add_user_entries',
            _('Enable'), _("Add user entries to the blacklist when updating"));
        o.rmempty = false;
        o.default = 0;
        depends_bllist_module(o);

        // USER_ENTRIES_DNS
        o = s.taboption('user_entries_tab', form.Value, 'user_entries_dns',
            _("DNS server that is used for FQDN entries"), '<code>ipaddress[#port]</code>');
        o.validate = validate_ip_port;

        // USER_ENTRIES edit dialog
        o = s.taboption('user_entries_tab', form.Button, '_user_entries_btn',
            _('User entries'));
        o.onclick = () => user_entries_edit.show();
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';


        let map_promise = m.render();
        map_promise.then(node => node.classList.add('fade-in'));

        return map_promise;
    },

    handleSaveApply: function(ev, mode) {
        return this.handleSave(ev).then(() => {
            ui.changes.apply(mode == '0');

            if(this.app_status_code != 1 && this.app_status_code != 2) {
                window.setTimeout(() => fs.exec(tools.init_path, [ 'restart' ]), 3000);
            };
        });
    },
});
