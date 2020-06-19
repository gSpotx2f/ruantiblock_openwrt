'use strict';
'require fs';
'require uci';
'require view.ruantiblock.tools as tools';

return L.Class.extend({
    title: _('Ruantiblock'),

    load: function() {
        return Promise.all([
            fs.exec(tools.exec_path, [ 'raw-status' ]),
            fs.exec(tools.exec_path, [ 'total-proxy-status' ]),
            fs.exec(tools.exec_path, [ 'vpn-route-status' ]),
            uci.load('ruantiblock'),
        ]).catch(e => {});
    },

    render: function(status_array) {
        if(!status_array) {
            return E('em', _('Error') + ': ' + _('Unable to execute or read contents'));
        };

        let app_status_code = status_array[0].code;
        let tp_status_code = status_array[1].code;
        let vpn_route_status_code = status_array[2].code;

        let section = uci.get('ruantiblock', 'config');
        let proxy_local_clients, proxy_mode, bllist_mode, bllist_module, bllist_source;

        if(typeof(section) === 'object') {
            proxy_local_clients = section.proxy_local_clients;
            proxy_mode = section.proxy_mode;
            bllist_mode = section.bllist_mode;
            bllist_module = section.bllist_module;
            bllist_source = section.bllist_source;
        } else {
            return _('Error');
        };

        document.head.append(E('style', { 'type': 'text/css' }, tools.css));

        return E('div', { 'class': 'cbi-section' }).innerHTML = tools.make_status_string(
                        app_status_code,
                        proxy_mode,
                        bllist_mode,
                        bllist_module,
                        bllist_source,
                        tp_status_code,
                        vpn_route_status_code);
    },
});
