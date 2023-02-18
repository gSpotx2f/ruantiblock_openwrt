'use strict';
'require fs';
'require poll';
'require ui';
'require view';
'require view.ruantiblock.tools as tools';

document.head.append(E('style', {'type': 'text/css'},
`
.log-entries-count {
	margin: 0 0 5px 5px;
	font-weight: bold;
	opacity: 0.7;
}
`));

return view.extend({
	pollInterval   : L.env.pollinterval,

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

	formatNftJson: function(data) {
		let output = { 'rules': [] };
		if(data.rules.nftables && data.rules.nftables.length > 1) {
			for(let i of data.rules.nftables) {
				if(!i.rule) continue;
				let set, bytes;
				i.rule.expr.forEach(e => {
					if(e.match) {
						set = e.match.right.replace('@', '');
					}
					else if(e.counter) {
						bytes = e.counter.bytes;
					};
				});
				output.rules.push([ set, bytes ]);
			};

			function parseDnsmasqData(set) {
				let sArray = [];
				if(data[set].nftables && data[set].nftables.length > 1) {
					data[set].nftables.forEach(e => {
						if(e.set && e.set.elem) {
							e.set.elem.forEach(i => {
								if(i.elem) {
									sArray.push([ i.elem.val, i.elem.expires ]);
								};
							});
						};
					});
				};
				return sArray;
			};

			output.dnsmasq = parseDnsmasqData('dnsmasq');
		};
		return output;
	},

	makeDnsmasqTable: function(ipDataArray) {
		let lines   = `<tr class="tr"><td class="td center">${_('No entries available...')}</td></tr>`;
		let ipTable = E('table', { 'id': 'ipTable', 'class': 'table' });

		if(ipDataArray.length > 0) {
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
		} catch(e) {
			if(e.name === 'SyntaxError') {
				ui.addNotification(null,
					E('p', {}, _('HTML/XML error') + ': ' + e.message), 'error');
			};
			throw e;
		};

		return E([
			E('div', { 'class': 'log-entries-count' },
				`${_('Entries')}: ${ipDataArray.length}`
			),
			ipTable,
		]);
	},

	pollInfo: function() {
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
			} catch(e) {};

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

				let nft_data = this.formatNftJson(data);

				if(nft_data.rules.length > 0) {
					for(let [set, bytes] of nft_data.rules) {
						let elem = document.getElementById('rules.' + set);
						if(elem) {
							elem.textContent = bytes;
						};
					};
				};

				if(nft_data.dnsmasq.length > 0) {
					let rdTableWrapper = document.getElementById('rdTableWrapper');
					rdTableWrapper.innerHTML = '';
					rdTableWrapper.append(this.makeDnsmasqTable(nft_data.dnsmasq));
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
		} catch(e) {};

		let update_status = null,
			rules         = null,
			dnsmasq       = null;
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

				let nft_data = this.formatNftJson(data);

				if(nft_data.rules) {
					let table_rules = E('table', { 'class': 'table' }, [
						E('tr', { 'class': 'tr table-titles' }, [
							E('th', { 'class': 'th left', 'style': 'min-width:33%' },
								_('Match-set')),
							E('th', { 'class': 'th left' }, _('Bytes')),
						]),
					]);

					for(let [set, bytes] of nft_data.rules) {
						table_rules.append(
							E('tr', { 'class': 'tr' }, [
								E('td',{
									'class'     : 'td left',
									'data-title': _('Match-set'),
								}, set + ' (' + set.replace(/^c/, 'CIDR').replace(/^i/, 'IP').replace(/^d/, 'dnsmasq') + ')'),
								E('td', {
									'class'     : 'td left',
									'id'        : 'rules.' + set,
									'data-title': _('Bytes'),
								}, bytes),
							])
						);
					};

					rules = E([
						E('h3', {}, _('Nftables rules')),
						table_rules,
					]);
				};

				if(nft_data.dnsmasq) {
					let rdTableWrapper = E('div', {
						'id'   : 'rdTableWrapper',
						'style': 'width:100%'
					}, this.makeDnsmasqTable(nft_data.dnsmasq));

					dnsmasq = E([
						E('h3', {}, _('Dnsmasq')),
						rdTableWrapper,
					]);
				};

				poll.add(L.bind(this.pollInfo, this), this.pollInterval);
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
				E('div', { 'class': 'cbi-section-node' }, rules)
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
