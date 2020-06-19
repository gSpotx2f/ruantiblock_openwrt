'use strict';
'require fs';
'require ui';
'require view.ruantiblock.tools as tools';

return L.view.extend({
    poll_info: function() {
        return fs.exec_direct(tools.exec_path, [ 'html-info' ], 'json').catch(e => {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s<br />[ %s ]'.format(e.message, tools.exec_path)
            ));
            L.Poll.stop();
        }).then(data => {
            if(!data) {
                return;
            };

            try {
                data = JSON.parse(data);
            } catch(err) {};

            if(data.status === 'enabled') {
                let date = document.getElementById('last_blacklist_update.date');

                if(data.last_blacklist_update.status) {
                    if(date) {
                        date.textContent = data.last_blacklist_update.date;
                    };

                    let ip = document.getElementById('last_blacklist_update.ip');
                    if(ip) {
                        ip.textContent = data.last_blacklist_update.ip;
                    };

                    let cidr = document.getElementById('last_blacklist_update.cidr');
                    if(cidr) {
                        cidr.textContent = data.last_blacklist_update.cidr;
                    };

                    let fqdn = document.getElementById('last_blacklist_update.fqdn');
                    if(fqdn) {
                        fqdn.textContent = data.last_blacklist_update.fqdn;
                    };
                } else {
                    if(date) {
                        date.textContent = _('No data');
                    };
                };

                if(data.iptables) {
                    for(let [k, v] of Object.entries(data.iptables)) {
                        if(k === '_dummy') continue;

                        let elem = document.getElementById('iptables.' + k);
                        if(elem) {
                            elem.textContent = v;
                        };
                    };
                };

                if(data.ipset) {
                    for(let [k, v] of Object.entries(data.ipset)) {
                        if(k === '_dummy') continue;

                        let elem0 = document.getElementById('ipset.' + k + '.' + '0');
                        let elem1 = document.getElementById('ipset.' + k + '.' + '1');
                        if(elem0 && elem1) {
                            elem0.textContent = v[0];
                            elem1.textContent = v[1];
                        };
                    };
                };
            } else {
                if(L.Poll.active()) {
                    L.Poll.stop();
                };
            };
        });
    },

    load: function() {
        return fs.exec_direct(tools.exec_path, [ 'html-info' ], 'json').catch(e => {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s<br />[ %s ]'.format(e.message, tools.exec_path)
            ));
        })
    },

    render: function(data) {
        if(!data) {
            return;
        };

        try {
            data = JSON.parse(data);
        } catch(err) {};

        let update_status = null,
            iptables = null,
            ipset = null;
        if(data) {
            if(data.status === 'enabled') {
                update_status = E('div', { 'class': 'table' });

                if(data.last_blacklist_update.status) {
                    update_status.append(
                        E('div', { 'class': 'tr' }, [
                            E('div', { 'class': 'td left', 'width': '33%' },
                                _('Last blacklist update')),
                            E('div', { 'class': 'td left', 'id': 'last_blacklist_update.date' },
                                data.last_blacklist_update.date),
                        ]),
                        E('div', { 'class': 'tr' }, [
                            E('div', { 'class': 'td left', 'width': '33%' }, 'IP'),
                            E('div', { 'class': 'td left', 'id': 'last_blacklist_update.ip' },
                                data.last_blacklist_update.ip),
                        ]),
                        E('div', { 'class': 'tr' }, [
                            E('div', { 'class': 'td left', 'width': '33%' }, 'CIDR'),
                            E('div', { 'class': 'td left', 'id': 'last_blacklist_update.cidr' },
                                data.last_blacklist_update.cidr),
                        ]),
                        E('div', { 'class': 'tr' }, [
                            E('div', { 'class': 'td left', 'width': '33%' }, 'FQDN'),
                            E('div', { 'class': 'td left', 'id': 'last_blacklist_update.fqdn' },
                                data.last_blacklist_update.fqdn),
                        ])
                    );
                } else {
                    update_status.append(
                        E('div', { 'class': 'tr' }, [
                            E('div', { 'class': 'td left', 'width': '33%' },
                                _('Last blacklist update')),
                            E('div', { 'class': 'td left' }, _('No data')),
                        ])
                    );
                };

                if(data.iptables) {
                    let table_iptables = E('div', { 'class': 'table' }, [
                        E('div', { 'class': 'tr table-titles' }, [
                            E('div', { 'class': 'th left', 'width': '33%' },
                                _('Match-set')),
                            E('div', { 'class': 'th left' }, _('Bytes')),
                        ]),
                    ]);

                    for(let [k, v] of Object.entries(data.iptables)) {
                        if(k === '_dummy') continue;

                        table_iptables.append(
                            E('div', { 'class': 'tr' }, [
                                E('div', { 'class': 'td left', 'width': '33%' },
                                    k),
                                E('div', { 'class': 'td left', 'id': 'iptables.' + k },
                                    v),
                            ])
                        );
                    };

                    iptables = E([
                        E('h3', {}, _('Iptables rules')),
                        table_iptables,
                    ]);
                };

                if(data.ipset) {
                    let table_ipset = E('div', { 'class': 'table' },
                        E('div', { 'class': 'tr table-titles' }, [
                            E('div', { 'class': 'th left', 'width': '33%' }, _('Name')),
                            E('div', { 'class': 'th left' }, _('Size in memory')),
                            E('div', { 'class': 'th left' }, _('Number of entries')),
                        ])
                    );

                    for(let [k, v] of Object.entries(data.ipset)) {
                        if(k === '_dummy') continue;

                        table_ipset.append(
                            E('div', { 'class': 'tr' }, [
                                E('div', { 'class': 'td left', 'width': '33%' }, k),
                                E('div', { 'class': 'td left', 'id': 'ipset.' + k + '.' + '0' },
                                    v[0]),
                                E('div', { 'class': 'td left', 'id': 'ipset.' + k + '.' + '1' },
                                    v[1]),
                            ])
                        );
                    };

                    ipset = E([
                        E('h3', {}, _('Ipset')),
                        table_ipset,
                    ]);
                };

                L.Poll.add(this.poll_info);
            } else {
                update_status = E('em', {}, _('Status') + ' : ' + _('disabled'));
            };
        };
        return E([
            E('h2', { 'class': 'fade-in' }, _('Ruantiblock') + ' - ' + _('Statistics')),
            E('div', { 'class': 'cbi-section-descr fade-in' }),
            E('div', { 'class': 'cbi-section fade-in' },
                E('div', { 'class': 'cbi-section-node' }, update_status)
            ),
            E('div', { 'class': 'cbi-section fade-in' },
                E('div', { 'class': 'cbi-section-node' }, iptables)
            ),
            E('div', { 'class': 'cbi-section fade-in' },
                E('div', { 'class': 'cbi-section-node' }, ipset)
            ),
        ]);
    },

    handleSave: null,
    handleSaveApply: null,
    handleReset: null,
});
