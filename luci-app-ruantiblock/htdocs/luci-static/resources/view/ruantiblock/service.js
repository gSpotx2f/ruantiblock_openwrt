'use strict';
'require fs';
'require uci';
'require ui';
'require view.ruantiblock.tools as tools';

const btn_style_neutral = 'btn'
const btn_style_action = 'btn cbi-button-action';
const btn_style_save = 'btn cbi-button-save important';
const btn_style_reset = 'btn cbi-button-reset important';
const btn_style_warning = 'btn cbi-button-negative important'
let status_token_value;

function disable_buttons(bool, btn, elems=[]) {
    let btn_start = elems[1] || document.getElementById("btn_start");
    let btn_destroy = elems[5] || document.getElementById("btn_destroy");
    let btn_enable = elems[2] || document.getElementById("btn_enable");
    let btn_update = elems[4] || document.getElementById("btn_update");
    let btn_tp = elems[3] || document.getElementById("btn_tp");

    btn_start.disabled = bool;
    btn_update.disabled = bool;
    btn_destroy.disabled = bool;
    if(btn === btn_update) {
        btn_enable.disabled = false;
    } else {
        btn_enable.disabled = bool;
    };
    if(btn_tp) {
        btn_tp.disabled = bool
    };
}

function get_app_status() {
    return Promise.all([
        fs.exec(tools.exec_path, [ 'raw-status' ]),
        fs.exec(tools.exec_path, [ 'total-proxy-status' ]),
        fs.exec(tools.exec_path, [ 'vpn-route-status' ]),
        fs.exec(tools.init_path, [ 'enabled' ]),
        L.resolveDefault(fs.read(tools.token_file), 0),
        uci.load(tools.app_name),
    ]).catch(e => {
        ui.addNotification(null, E('p', _('Unable to execute or read contents')
            + ': %s<br />[ %s | %s | %s ]'.format(
                e.message, tools.exec_path, tools.init_path, 'uci.ruantiblock'
        )));
    });
}

function set_app_status(status_array, elems=[], force_app_code) {
    let section = uci.get(tools.app_name, 'config');
    if(!status_array || typeof(section) !== 'object') {
        (elems[0] || document.getElementById("status")).innerHTML = tools.make_status_string(1);
        ui.addNotification(null, E('p', _('Unable to read the contents')
            + ': set_app_status()'));
        disable_buttons(true, null, elems);
        return;
    };

    let app_status_code = (force_app_code) ? force_app_code : status_array[0].code;
    let tp_status_code = status_array[1].code;
    let vpn_route_status_code = status_array[2].code;
    let enabled_flag = status_array[3].code;

    let proxy_local_clients = section.proxy_local_clients;
    let proxy_mode = section.proxy_mode;
    let bllist_mode = section.bllist_mode;
    let bllist_module = section.bllist_module;
    let bllist_source = section.bllist_source;

    let btn_enable = elems[2] || document.getElementById('btn_enable');
    if(enabled_flag == 0) {
        btn_enable.onclick = ui.createHandlerFn(this, button_action, 'disable');
        btn_enable.textContent = _('Disable');
        btn_enable.className = btn_style_reset;
    } else {
        btn_enable.onclick = ui.createHandlerFn(this, button_action, 'enable');
        btn_enable.textContent = _('Enable');
        btn_enable.className = btn_style_save;
    };

    let btn_tp = elems[3] || document.getElementById('btn_tp');
    if(btn_tp) {
        if(tp_status_code == 0) {
            btn_tp.onclick = ui.createHandlerFn(this, button_action, 'total-proxy-off');
            btn_tp.textContent = _('Disable');
            btn_tp.className = btn_style_reset;
        } else {
            btn_tp.onclick = ui.createHandlerFn(this, button_action, 'total-proxy-on');
            btn_tp.textContent = _('Enable');
            btn_tp.className = btn_style_save;
        };
    };

    let btn_start = elems[1] || document.getElementById("btn_start");
    let btn_update = elems[4] || document.getElementById("btn_update");
    let btn_destroy = elems[5] || document.getElementById("btn_destroy");

    function btn_start_state_on() {
        btn_start.onclick = ui.createHandlerFn(this, button_action, 'stop');
        btn_start.textContent = _('Disable');
        btn_start.className = btn_style_reset;
    }

    function btn_start_state_off() {
        btn_start.onclick = ui.createHandlerFn(this, button_action, 'start');
        btn_start.textContent = _('Enable');
        btn_start.className = btn_style_action;
    }

    if(app_status_code == 0) {
        disable_buttons(false, null, elems);
        btn_start_state_on();
        btn_destroy.disabled = false;
        btn_update.disabled = false;
        if(btn_tp) {
            btn_tp.disabled = false;
        };
    }
    else if(app_status_code == 2) {
        disable_buttons(false, null, elems);
        btn_start_state_off();
        btn_update.disabled = true;
        if(btn_tp) {
            btn_tp.disabled = true;
        };
    }
    else if(app_status_code == 3) {
        btn_start_state_off();
        disable_buttons(true, btn_start, elems);
    }
    else if(app_status_code == 4) {
        btn_start_state_on();
        disable_buttons(true, btn_update, elems);
    }
    else {
        ui.addNotification(null, E('p', _('Error')
            + ' %s: return code = %s'.format(tools.exec_path, app_status_code)));
        disable_buttons(true, null, elems);
    };

    (elems[0] || document.getElementById("status")).innerHTML = tools.make_status_string(
                            app_status_code,
                            proxy_mode,
                            bllist_mode,
                            bllist_module,
                            bllist_source,
                            tp_status_code,
                            vpn_route_status_code);

    if(!L.Poll.active()) {
        L.Poll.start();
    };
}

function button_action(action) {
    let btn,
        cmd = tools.exec_path;

    switch(action) {
        case 'start':
        case 'stop':
            btn = document.getElementById('btn_start');
            break;
        case 'destroy':
            btn = document.getElementById('btn_destroy');
            break;
        case 'update':
            btn = document.getElementById('btn_update');
            break;
        case 'enable':
        case 'disable':
            btn = document.getElementById('btn_enable');
            cmd = tools.init_path;
            break;
        case 'total-proxy-on':
        case 'total-proxy-off':
            btn = document.getElementById('btn_tp');
            break;
    }

    disable_buttons(true, btn);
    L.Poll.stop();

    if(action === 'update') {
        get_app_status().then(status_array => {
            set_app_status(status_array, [], 4);
        });
    };

    return fs.exec_direct(cmd, [ action ]).then(res => {
        return get_app_status().then(
                (status_array) => {
                    set_app_status(status_array);
                    ui.hideModal();
                });
    });
}

return L.view.extend({
    poll_status: function() {
        return fs.read(tools.token_file).then(v => {
            v = tools.normalize_value(v);
            if(v != status_token_value) {
                get_app_status().then(set_app_status);
            }
            status_token_value = v;
        }).catch(e => {
            status_token_value = 0;
        });
    },

    dialog_destroy: function(ev) {
        ev.target.blur();
        let cancel_button = E('button', {
            'class': btn_style_neutral,
            'click': ui.hideModal,
        }, _('Cancel'));

        let shutdown_btn = E('button', {
            'class': btn_style_warning,
        }, _('Shutdown'));
        shutdown_btn.onclick = ui.createHandlerFn(this, function() {
            cancel_button.disabled = true;
            return button_action('destroy');
        });

        ui.showModal(_('Shutdown'), [
            E('div', { 'class': 'cbi-section' }, [
                E('p', _('The service will be disabled and all blacklist data will be deleted. Continue?')),
            ]),
            E('div', { 'class': 'right' }, [
                shutdown_btn,
                ' ',
                cancel_button,
            ])
        ]);
    },

    load: function() {
        return get_app_status();
    },

    render: function(status_array) {
        if(!status_array) {
            return;
        };

        let section = uci.get(tools.app_name, 'config');
        let proxy_local_clients = (typeof(section) === 'object') ? section.proxy_local_clients : null;
        status_token_value = (Array.isArray(status_array)) ? tools.normalize_value(status_array[4]) : null;

        document.head.append(E('style', {'type': 'text/css'}, tools.css));

        let status_string = E('div', {
            'id': 'status',
            'name': 'status',
            'class': 'cbi-section-node',
        });

        let layout = E('div', { 'class': 'cbi-section-node' });

        function layout_append(elem, title, descr) {
            descr = (descr) ? E('div', { 'class': 'cbi-value-description' }, descr) : '';
            layout.append(
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, title),
                    E('div', { 'class': 'cbi-value-field' }, [ elem, descr ]),
                ])
            )
        };

        let btn_start = E('button', {
            'id': 'btn_start',
            'name': 'btn_start',
            'class': btn_style_action,
        }, _('Enable'));
        layout_append(btn_start, _('Service'));

        let btn_enable = E('button', {
            'id': 'btn_enable',
            'name': 'btn_enable',
            'class': btn_style_save,
        }, _('Enable'));
        layout_append(btn_enable, _('Run at startup'));

        let btn_tp = E('button', {
            'id': 'btn_tp',
            'name': 'btn_tp',
            'class': btn_style_save,
        }, _('Enable'));
        if(proxy_local_clients == '0') {
            layout_append(btn_tp, _('Total-proxy'),
                _('All traffic goes through the proxy without applying rules'));
        };

        let btn_update = E('button', {
            'id': 'btn_update',
            'name': 'btn_update',
            'class': btn_style_action,
        }, _('Update'));
        btn_update.onclick = ui.createHandlerFn(this, () => { button_action('update') });
        layout_append(btn_update, _('Update blacklist'));

        let btn_destroy = E('button', {
            'id': 'btn_destroy',
            'name': 'btn_destroy',
            'class': btn_style_reset,
        }, _('Shutdown'));
        btn_destroy.onclick = this.dialog_destroy;

        layout_append(btn_destroy, _('Shutdown'),
            _('Complete service shutdown, as well as deleting ipsets and blacklist data'));

        set_app_status(status_array, [
            status_string,
            btn_start,
            btn_enable,
            btn_tp,
            btn_update,
            btn_destroy,
        ]);

        L.Poll.add(this.poll_status);

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

    handleSave: null,
    handleSaveApply: null,
    handleReset: null,
});
