'use strict';
'require fs';
'require ui';
'require view.ruantiblock.tools as tools';

let crontab_regexp = new RegExp(`^(\\*?\\/?(\\d){0,2}\\s){5}${tools.exec_path} update(\n)?`, 'gm');
let current_crontab_content;

function to_dd(n){
    return String(n).replace(/^(\d)$/, "0$1");
};

function cron_status_string(s) {
    return s || _('No Shedule');
}

function pick_cron_task(content) {
    if(!content){
        return;
    };
    let current_tasks = content.match(crontab_regexp) || [];
    return current_tasks.join('');
};

function set_cron_status(value) {
    document.getElementById('cron_status').value = cron_status_string(value);
    document.getElementById("btn_cron_del").style.visibility = (value) ? 'visible' : 'hidden';
}

function write_cron_file() {
    let btn_cron_add = document.getElementById('btn_cron_add');
    let btn_cron_del = document.getElementById('btn_cron_del');

    if(!current_crontab_content) {
        ui.addNotification(null, E('p', _('No changes to save.')));
        btn_cron_add.disabled = false;
        return;
    };

    return fs.write(tools.crontab_file, current_crontab_content).then(rc => {
            ui.addNotification(null, E('p',_('Changes have been saved.')), 'info');
            set_cron_status(pick_cron_task(current_crontab_content));
        }).then(() => {
            return fs.exec('/etc/init.d/cron', [ 'enabled' ]).then(res => {
                 if(res.code !== 0) {
                    return fs.exec('/etc/init.d/cron', [ 'enable' ]);
                };
            }).catch(e => {
                ui.addNotification(null, E('p', _('Unable to execute or read contents')
                    + ': %s<br />[ %s ]'.format(e.message, '/etc/init.d/cron')));
            });
        }).finally(() => {
            return fs.exec('/etc/init.d/cron', [ 'restart' ]).catch(e => {
                ui.addNotification(null, E('p', _('Unable to execute or read contents')
                    + ': %s<br />[ %s ]'.format(e.message, '/etc/init.d/cron')));
            });
        }).catch(e => {
            ui.addNotification(null, E('p', _('Unable to save the changes')
                + ': %s<br />[ %s ]'.format(
                    e.message, tools.crontab_file
            )));
        });
}

function del_cron_schedule(ev) {
    if(current_crontab_content) {
        current_crontab_content = current_crontab_content.replace(crontab_regexp, "");
    };
    return write_cron_file();
};

function set_cron_schedule(ev) {
    let hour_interval = document.getElementById('cron_hour_interval').value;
    let day_interval = document.getElementById('cron_day_interval').value;
    let hour = document.getElementById('cron_hour').value;
    let min = document.getElementById('cron_min').value;
    let task_string = '%s %s %s * * %s update\n'.format(
        min,
        (!hour_interval) ? hour : (hour_interval == "1") ? '*' : '*/' + hour_interval,
        (hour_interval || day_interval == "1") ? '*' : '*/' + day_interval,
        tools.exec_path
    );
    if(current_crontab_content) {
        current_crontab_content = current_crontab_content.replace(crontab_regexp, "") + task_string;
    };
    return write_cron_file();
};

function onchange_hour_interval(e) {
    let value = e.target.value;
    let bool = (value != '');
    let cron_hour = document.getElementById('cron_hour');
    let cron_day_interval = document.getElementById('cron_day_interval');
    cron_hour.disabled = bool;
    cron_day_interval.disabled = bool;

    // For luci-theme-material
    if(bool) {
        cron_hour.style.opacity = '50%';
        cron_day_interval.style.opacity = '50%';
    } else {
        cron_hour.style.opacity = '100%';
        cron_day_interval.style.opacity = '100%';
    };
}

return L.view.extend({
    load: function() {
        return fs.read(tools.crontab_file).catch(e => {
            ui.addNotification(null, E('p', _('Unable to read the contents')
                + ': %s<br />[ %s ]'.format(
                    e.message, tools.crontab_file
            )));
        });
    },

    render: function(content) {
        current_crontab_content = content;
        let current_task = pick_cron_task(content);

        let cron_status = E('textarea', {
            'id': 'cron_status',
            'name': 'cron_status',
            'style': 'width:30em; padding:5px 10px 5px 10px !important; vertical-align:middle; resize:none !important;',
            'readonly': 'readonly',
            'wrap': 'off',
            'rows': 2,
        }, cron_status_string(current_task));

        let btn_cron_del = E('button', {
            'class': 'cbi-button btn cbi-button-reset',
            'id': 'btn_cron_del',
            'name': 'btn_cron_del',
        }, _('Reset'));
        btn_cron_del.onclick = ui.createHandlerFn(this, del_cron_schedule);
        btn_cron_del.style.visibility = (current_task) ? 'visible' : 'hidden';

        let status_header = E('div', { 'class': 'cbi-section-node' }, [
            E('div', { 'class': 'cbi-value' }, [
                E('label', { 'class': 'cbi-value-title', 'for': 'cron_status' },
                    _('Current schedule')),
                E('div', { 'class': 'cbi-value-field' }, [ cron_status, ' ', btn_cron_del ]),
            ])
        ]);

        let layout = E('div', { 'class': 'cbi-section-node' });

        function layout_append(elem, title, descr) {
            descr = (descr) ? E('div', { 'class': 'cbi-value-description' }, descr) : '';
            layout.append(
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title', 'for': elem.id || null },
                        title),
                    E('div', { 'class': 'cbi-value-field' }, [ elem, descr ]),
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
            cron_hour_interval.append(E('option', { 'value': String(i) }, '&#8727;/' + i));
        };
        layout_append(cron_hour_interval, _('Hour'));
        cron_hour_interval.onchange = onchange_hour_interval;

        let cron_day_interval = E('select',
            { 'id': 'cron_day_interval', 'style': 'width:60px !important; min-width:60px !important' },
            E('option', { 'value': '1' }, '&#8727;')
        );
        for(let i = 2; i < 8 ; i++) {
            cron_day_interval.append(E('option', { 'value': String(i) }, '&#8727;/' + i));
        };
        cron_day_interval.append(E('option', { 'value': '14' }, '&#8727;/14'));
        cron_day_interval.append(E('option', { 'value': '28' }, '&#8727;/28'));
        layout_append(cron_day_interval,  _('Day'));

        layout_append(E('b', {}, _('Time')));

        let cron_hour = E('select',
            { 'id': 'cron_hour', 'style': 'width:60px !important; min-width:60px !important' });
        for(let i = 0; i < 24 ; i++) {
            cron_hour.append(E('option', { 'value': String(i) }, to_dd(i)));
        };
        layout_append(cron_hour, _('Hour'));

        let cron_min = E('select',
            { 'id': 'cron_min', 'style': 'width:60px !important; min-width:60px !important' });
        for(let i = 0; i < 60 ; i++) {
            cron_min.append(E('option', { 'value': String(i) }, to_dd(i)));
        };
        layout_append(cron_min, _('Minute'));

        let btn_cron_add = E('button', {
            'class': 'btn cbi-button-save',
            'id': 'btn_cron_add',
            'name': 'btn_cron_add'
        }, _('Set'));
        btn_cron_add.onclick = ui.createHandlerFn(this, set_cron_schedule);
        layout_append(btn_cron_add);

        return E([
            E('h2',
                { 'class': 'fade-in' }, _('Ruantiblock') + ' - ' + _('Blacklist updates') + ' (cron)'),
            E('div', { 'class': 'cbi-section-descr fade-in' }),
            E('div', { 'class': 'cbi-section fade-in' }, status_header),
            E('div', { 'class': 'cbi-section fade-in' }, layout),
        ]);

    },

    handleSave: null,
    handleSaveApply: null,
    handleReset: null,
});
