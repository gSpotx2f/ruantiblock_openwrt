'use strict';
'require fs';
'require poll';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

return view.extend({
	infoPoll: function() {
		return fs.exec_direct(tools.execPath, [ 'html-info' ], 'json').catch(e => {
			ui.addNotification(null, E('p', _('Unable to execute or read contents')
				+ ': %s [ %s ]'.format(e.message, tools.execPath)
			));
			poll.stop();
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

					let ip   = document.getElementById('last_blacklist_update.ip');
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
				if(poll.active()) {
					poll.stop();
				};
			};
		});
	},

	load: function() {
		return fs.exec_direct(tools.execPath, [ 'html-info' ], 'json').catch(e => {
			ui.addNotification(null, E('p', _('Unable to execute or read contents')
				+ ': %s [ %s ]'.format(e.message, tools.execPath)
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
				update_status = E('table', { 'class': 'table' });

				if(data.last_blacklist_update.status) {
					update_status.append(
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left', 'style': 'min-width:33%' },
								_('Last blacklist update') + ':'),
							E('td', { 'class': 'td left',
										'id': 'last_blacklist_update.date' },
								data.last_blacklist_update.date),
						]),
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' }, 'IP:'),
							E('td', { 'class': 'td left',
										'id': 'last_blacklist_update.ip' },
								data.last_blacklist_update.ip),
						]),
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' }, 'CIDR:'),
							E('td', { 'class': 'td left',
										'id': 'last_blacklist_update.cidr' },
								data.last_blacklist_update.cidr),
						]),
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' }, 'FQDN:'),
							E('td', { 'class': 'td left',
										'id': 'last_blacklist_update.fqdn' },
								data.last_blacklist_update.fqdn),
						])
					);
				} else {
					update_status.append(
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' },
								_('Last blacklist update')),
							E('td', { 'class': 'td left' }, _('No data')),
						])
					);
				};

				if(data.iptables) {
					let table_iptables = E('table', { 'class': 'table' }, [
						E('tr', { 'class': 'tr table-titles' }, [
							E('th', { 'class': 'th left', 'style': 'min-width:33%' },
								_('Match-set')),
							E('th', { 'class': 'th left' }, _('Bytes')),
						]),
					]);

					for(let [k, v] of Object.entries(data.iptables)) {
						if(k === '_dummy') continue;
						table_iptables.append(
							E('tr', { 'class': 'tr' }, [
								E('td', {
									'class'     : 'td left',
									'data-title': _('Match-set'),
								}, k),
								E('td', {
									'class'     : 'td left',
									'id'        : 'iptables.' + k,
									'data-title': _('Bytes'),
								}, v),
							])
						);
					};

					iptables = E([
						E('h3', {}, _('Iptables rules')),
						table_iptables,
					]);
				};

				if(data.ipset) {
					let table_ipset = E('table', { 'class': 'table' },
						E('tr', { 'class': 'tr table-titles' }, [
							E('th', { 'class': 'th left', 'style': 'min-width:33%' },
								_('Name')),
							E('th', { 'class': 'th left' },
								_('Size in memory')),
							E('th', { 'class': 'th left' },
								_('Number of entries')),
						])
					);

					for(let [k, v] of Object.entries(data.ipset)) {
						if(k === '_dummy') continue;

						table_ipset.append(
							E('tr', { 'class': 'tr' }, [
								E('td', {
									'class': 'td left',
									'data-title': _('Name'),
								}, k),
								E('td', {
									'class'     : 'td left',
									'id'        : 'ipset.' + k + '.' + '0',
									'data-title': _('Size in memory'),
								}, v[0]),
								E('td', {
									'class'     : 'td left',
									'id'        : 'ipset.' + k + '.' + '1',
									'data-title': _('Number of entries'),
								}, v[1]),
							])
						);
					};

					ipset = E([
						E('h3', {}, _('Ipset')),
						table_ipset,
					]);
				};

				poll.add(this.infoPoll);
			} else {
				update_status = E('em', {}, _('Status') + ' : ' + _('disabled'));
			};
		};
		return E([
			E('h2', { 'class': 'fade-in' },
				_('Ruantiblock') + ' - ' + _('Statistics')
			),
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

	handleSave     : null,
	handleSaveApply: null,
	handleReset    : null,
});
