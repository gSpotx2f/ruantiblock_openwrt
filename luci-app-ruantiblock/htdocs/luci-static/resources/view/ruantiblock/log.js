'use strict';
'require fs';
'require ui';
'require view.ruantiblock.tools as tools';

let log_regexp = new RegExp(`^.*(user\\.notice ${tools.app_name}).*$`, 'gm');

return L.view.extend({
    tail_default: 25,

    parse_log_data: function(logdata) {
        return logdata.trim().match(log_regexp);
    },

    load: function() {
        return Promise.all([
            L.resolveDefault(fs.stat('/sbin/logread'), null),
            L.resolveDefault(fs.stat('/usr/sbin/logread'), null),
        ]).then(stat => {
            let logger = (stat[0]) ? stat[0].path : (stat[1]) ? stat[1].path : null;

            if(logger) {
                return fs.exec_direct(logger, [ '-e', tools.app_name ]).catch(e => {
                    ui.addNotification(null, E('p', _('Unable to execute or read contents')
                        + ': %s<br />[ %s ]'.format(e.message, logger)
                    ));
                    return '';
                });
            };
        });
    },

    render: function(logdata) {
        let nav_btns_top = '120px';
        let loglines = this.parse_log_data(logdata);

         let log_textarea = E('textarea', {
            'id': 'syslog',
            'class': 'cbi-input-textarea',
            'style': 'width:100% !important; padding: 0 0 0 45px; font-size:12px',
            'readonly': 'readonly',
            'wrap': 'off',
            'rows': this.tail_default,
            'spellcheck': 'false',
        }, [ loglines.slice(-this.tail_default).join('\n') ]);

        let tail_value = E('input', {
            'id': 'tail_value',
            'name': 'tail_value',
            'type': 'text',
            'form': 'log_form',
            'class': 'cbi-input-text',
            'style': 'width:4em !important; min-width:4em !important',
            'maxlength': 5,
        });
        tail_value.value = this.tail_default;
        ui.addValidator(tail_value, 'uinteger', true);

        let log_filter = E('input', {
            'id': 'log_filter',
            'name': 'log_filter',
            'type': 'text',
            'form': 'log_form',
            'class': 'cbi-input-text',
            'style': 'margin-left:1em !important; width:16em !important; min-width:16em !important',
            'placeholder': _('Message filter'),
            'data-tooltip': _('Filter messages with a regexp'),
        });

        let log_form_submit_btn = E('input', {
            'type': 'submit',
            'form': 'log_form',
            'class': 'cbi-button btn',
            'style': 'margin-left:1em !important; vertical-align:middle',
            'value': _('Apply'),
            'click': ev => ev.target.blur(),
        });

        function set_log_tail(c_arr) {
            let tail_num_val = tail_value.value;
            if(tail_num_val && tail_num_val > 0 && c_arr) {
                return c_arr.slice(-tail_num_val);
            };
            return c_arr;
        }

        function set_log_filter(c_arr) {
            let f_pattern = log_filter.value;
            if(!f_pattern) {
                return c_arr;
            };
            let f_arr = [];
            try {
                f_arr = c_arr.filter(s => new RegExp(f_pattern.toLowerCase()).test(s.toLowerCase()));
            } catch(err) {
                if(err.name === 'SyntaxError') {
                    ui.addNotification(null,
                        E('p', {}, _('Wrong regular expression') + ': ' + err.message));
                    return c_arr;
                } else {
                    throw err;
                };
            };
            if(f_arr.length === 0) {
                f_arr.push(_('No matches...'));
            };
            return f_arr;
        }

        return E([
            E('h2', { 'id': 'log_title', 'class': 'fade-in' }, _('Ruantiblock') + ' - ' + _('Log')),
            E('div', { 'class': 'cbi-section-descr fade-in' }),
            E('div', { 'class': 'cbi-section fade-in' },
                E('div', { 'class': 'cbi-section-node' },
                    E('div', { 'class': 'cbi-value' }, [
                        E('label', { 'class': 'cbi-value-title', 'for': 'tail_value' },
                            _('Show only the last messages')),
                        E('div', { 'class': 'cbi-value-field' }, [
                            tail_value,
                            E('input', {
                                'type': 'button',
                                'form': 'log_form',
                                'class': 'cbi-button btn cbi-button-reset',
                                'value': 'Χ',
                                'click': ev => {
                                    tail_value.value = null;
                                    log_form_submit_btn.click();
                                    ev.target.blur();
                                },

                            }),
                            log_filter,
                            E('input', {
                                'type': 'button',
                                'form': 'log_form',
                                'class': 'cbi-button btn cbi-button-reset',
                                'value': 'Χ',
                                'click': ev => {
                                    log_filter.value = null;
                                    log_form_submit_btn.click();
                                    ev.target.blur();
                                },
                            }),
                            log_form_submit_btn,
                            E('form', {
                                'id': 'log_form',
                                'name': 'log_form',
                                'style': 'display:inline-block; margin-left:1em !important',
                                'submit': ui.createHandlerFn(this, function(ev) {
                                    ev.preventDefault();
                                    let form_elems = Array.from(document.forms.log_form.elements);
                                    form_elems.forEach(e => e.disabled = true);

                                    return this.load().then(logdata => {
                                        let loglines = set_log_filter(set_log_tail(
                                            this.parse_log_data(logdata)));
                                        log_textarea.value = loglines.join('\n');
                                    }).finally(() => {
                                        form_elems.forEach(e => e.disabled = false);
                                    });
                                }),
                            }, E('span', {}, '&#160;')),
                        ]),
                    ])
                )
            ),
            E('div', { 'class': 'cbi-section fade-in' },
                E('div', { 'class': 'cbi-section-node' },
                    E('div', { 'class': 'cbi-value' }, [
                        E('div', { 'style': 'position:fixed' }, [
                            E('button', {
                                'class': 'btn',
                                'style': 'position:relative; display:block; margin:0 !important; left:1px; top:'
                                    + nav_btns_top,
                                'click': ev => {
                                    log_textarea.scrollTop = 0;
                                    ev.target.blur();
                                },
                            }, '&#8593;'),
                            E('button', {
                                'class': 'btn',
                                'style': 'position:relative; display:block; margin:0 !important; margin-top:1px !important; left:1px; top:'
                                    + nav_btns_top,
                                'click': ev => {
                                    log_textarea.scrollTop = log_textarea.scrollHeight;
                                    ev.target.blur();
                                },
                            }, '&#8595;'),
                        ]),
                        log_textarea,
                    ])
                )
            ),
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
});

