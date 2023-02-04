'use strict';
'require fs';
'require poll';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

return view.extend({
	secToTimeString: function(value) {
		let string = '';
		if(/^\d+$/.test(value)) {
			value = Number(value);
			let hours = 0, mins = 0, sec = 0, rest = value;
			if(value >= 3600) {
				hours = Math.floor(value / 3600);
				rest  = value % 3600;
			};
			if(rest >= 60) {
				mins = Math.floor(rest / 60);
				rest = rest % 60;
			};
			sec = rest;
			if(hours > 0) {
				string = string + hours + _('h');
			};
			if(mins > 0) {
				string = string + ' ' + mins + _('m');
			};
			string = string + ' ' + sec + _('s');
		};
		return string;
	},

	makeDnsmasqTable: function(ipDataArray) {
		let lines   = `<tr class="tr"><td class="td center">${_('No entries available...')}</td></tr>`;
		let ipTable = E('table', { 'id': 'ipTable', 'class': 'table' });

		if(ipDataArray.length > 1) {
			lines = [];
			ipDataArray.forEach((e, i) => {
				if(e) {
					lines.push(
						`<tr class="tr"><td class="td left" data-title="${_('IP address')}">${e[0]}</td>` +
						`<td class="td left" data-title="${_('Timeout')}">${(e[1]) ? this.secToTimeString(e[1]) : ''}</td></tr>`
					);
				};
			});
			lines = lines.join('');

			ipTable.append(
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th left', 'style': 'min-width:33%' }, _('IP address')),
					(ipDataArray[0][1]) ? E('th', { 'class': 'th left' }, _('Timeout')) : ''
				])
			);
		};

		try {
			ipTable.insertAdjacentHTML('beforeend', lines);
		} catch(err) {
			if(err.name === 'SyntaxError') {
				ui.addNotification(null,
					E('p', {}, _('HTML/XML error') + ': ' + err.message), 'error');
			};
			throw err;
		};

		return ipTable;
	},

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

				if(data.dnsmasq) {
					let rdTableWrapper = document.getElementById('rdTableWrapper');
					rdTableWrapper.innerHTML = '';
					rdTableWrapper.append(this.makeDnsmasqTable(data.dnsmasq));
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
			ipset    = null,
			dnsmasq  = null;
		if(data) {
			if(data.status === 'enabled') {
				update_status = E('table', { 'class': 'table' });

				if(data.last_blacklist_update.status) {
					update_status.append(
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left', 'style': 'min-width:33%' },
								_('Last blacklist update') + ':'),
							E('td', { 'class': 'td left',
										'id' : 'last_blacklist_update.date' },
								data.last_blacklist_update.date),
						]),
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' }, 'CIDR:'),
							E('td', { 'class': 'td left',
										'id' : 'last_blacklist_update.cidr' },
								data.last_blacklist_update.cidr),
						]),
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' }, 'IP:'),
							E('td', { 'class': 'td left',
										'id' : 'last_blacklist_update.ip' },
								data.last_blacklist_update.ip),
						]),
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left' }, 'FQDN:'),
							E('td', { 'class': 'td left',
										'id' : 'last_blacklist_update.fqdn' },
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

				if(data.dnsmasq) {
					let rdTableWrapper = E('div', {
						'id'   : 'rdTableWrapper',
						'style': 'width:100%'
					}, this.makeDnsmasqTable(data.dnsmasq));

					dnsmasq = E([
						E('h3', {}, _('Dnsmasq')),
						rdTableWrapper,
					]);
				};

				poll.add(L.bind(this.infoPoll, this));
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
			E('div', { 'class': 'cbi-section fade-in' },
				E('div', { 'class': 'cbi-section-node' }, dnsmasq)
			),

		]);
	},

	handleSave     : null,
	handleSaveApply: null,
	handleReset    : null,
});
