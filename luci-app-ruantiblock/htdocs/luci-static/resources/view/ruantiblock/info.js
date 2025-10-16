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

	secToTimeString(value) {
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

	formatNftJson(data) {
		let output = { 'rules': [] };
		if(data.rules.nftables && data.rules.nftables.length > 1) {
			for(let i of data.rules.nftables) {
				if(!i.rule) {
					continue;
				};

				let set, bytes;
				i.rule.expr.forEach(e => {
					if(e.match && e.match.left && e.match.left.payload) {
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
				if(set.nftables && set.nftables.length > 1) {
					set.nftables.forEach(e => {
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

			if(data.dnsmasq) {
				output.dnsmasq = parseDnsmasqData(data.dnsmasq);
			};
			if(data.dnsmasq_bypass) {
				output.dnsmasq_bypass = parseDnsmasqData(data.dnsmasq_bypass);
			};
			if(data.dnsmasq_user_instances) {
				output.dnsmasq_user_instances = [];
				if(data.dnsmasq_user_instances && data.dnsmasq_user_instances.length > 1) {
					for(let i of data.dnsmasq_user_instances) {
						if(i.nftables) {
							let name;
							i.nftables.forEach(e => {
								if(e.set) {
									name = e.set.name;
								};
							});
							output.dnsmasq_user_instances.push([ name, parseDnsmasqData(i) ]);
						};
					};
				};
			};
		};
		return output;
	},

	makeDnsmasqTable(ipDataArray, title) {
		let lines   = `<tr class="tr"><td class="td center">${_('No entries available...')}</td></tr>`;
		let ipTable = E('table', { 'id': 'ipTable', 'class': 'table' });

		ipDataArray.sort((a, b) => a[1] - b[1]);

		if(ipDataArray.length > 0) {
			lines = [];
			ipDataArray.forEach((e, i) => {
				if(e) {
					lines.push(
						`<tr class="tr"><td class="td left" data-title="${_('IP address')}">${e[0]}</td>` +
						`<td class="td left" data-title="${_('Timeout')}">${this.secToTimeString(e[1] | 0)}</td></tr>`
					);
				};
			});
			lines = lines.join('');

			ipTable.append(
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th left', 'style': 'width:33%' }, _('IP address')),
					E('th', { 'class': 'th left' }, _('Timeout')),
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
			E('h3', {}, title),
			E('div', { 'class': 'log-entries-count' },
				`${_('Entries')}: ${ipDataArray.length}`
			),
			ipTable,
		]);
	},

	pollInfo() {
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

				let rdTableWrapper = document.getElementById('rdTableWrapper');
				if(rdTableWrapper) {
					rdTableWrapper.innerHTML = '';
					rdTableWrapper.append(this.makeDnsmasqTable(nft_data.dnsmasq, _('Dnsmasq')));
				};

				let rdsTableWrapper = document.getElementById('rdsTableWrapper');
				if(rdsTableWrapper) {
					rdsTableWrapper.innerHTML = '';
					for(let i of nft_data.dnsmasq_user_instances) {
						rdsTableWrapper.append(this.makeDnsmasqTable(i[1], _('Dnsmasq') + ' ' + i[0]));
					};
				};
				let rdbTableWrapper = document.getElementById('rdbTableWrapper');
				if(rdbTableWrapper) {
					rdbTableWrapper.innerHTML = '';
					rdbTableWrapper.append(this.makeDnsmasqTable(nft_data.dnsmasq_bypass, _('Dnsmasq bypass')));
				};
			} else {
				if(poll.active()) {
					poll.stop();
				};
			};
		});
	},

	formatRuleDescription(s) {
		return (s.length >= 1) ? (
			s.replace(/^c\.?(.*)/, '$1 CIDR').replace(/^i\.?(.*)/, '$1 IP')
			.replace(/^d\.?(.*)/, '$1 dnsmasq').replace(/^onion\.?(.*)/, '$1 onion')
			.replace(/^bi/, 'bypass IP').replace(/^bd/, 'bypass dnsmasq')
		) : '';
	},

	load() {
		return fs.exec_direct(tools.execPath, [ 'html-info' ], 'json').catch(e => {
			ui.addNotification(null, E('p', _('Unable to execute or read contents')
				+ ': %s [ %s ]'.format(e.message, tools.execPath)
			));
		})
	},

	render(data) {
		if(!data) {
			return;
		};

		try {
			data = JSON.parse(data);
		} catch(e) {};

		let update_status        = null,
			user_entries         = null,
			rules                = null,
			dnsmasq              = null,
			dnsmasqUserInstances = null,
			dnsmasqBypass        = null;

		if(data) {
			if(data.status === 'enabled') {
				update_status = E('table', { 'class': 'table' });

				if(data.last_blacklist_update.status) {
					update_status.append(
						E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td left', 'style': 'width:33%' },
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

				if(data.user_entries && data.user_entries.length > 0) {
					user_entries = E('table', { 'class': 'table' });
					for(let i of data.user_entries) {
						user_entries.append(
							E('tr', { 'class': 'tr' }, [
								E('td', { 'class': 'td left', 'style': 'word-wrap:break-word' },
									i.id),
								E('td', { 'class': 'td left',
											'id' : 'user_entries_' + i },
									`CIDR: ${i.cidr}, IP: ${i.ip}, FQDN: ${i.fqdn}`),
							])
						);
					};
				};

				let nft_data = this.formatNftJson(data);

				if(nft_data.rules) {
					let table_rules = E('table', { 'class': 'table' }, [
						E('tr', { 'class': 'tr table-titles' }, [
							E('th', { 'class': 'th left', 'style': 'width:33%' },
								_('Match-set')),
							E('th', { 'class': 'th left' }, _('Description')),
							E('th', { 'class': 'th left' }, _('Bytes')),
						]),
					]);

					for(let [set, bytes] of nft_data.rules) {
						if(!set) {
							continue;
						};
						table_rules.append(
							E('tr', { 'class': 'tr' }, [
								E('td',{
									'class'     : 'td left',
									'data-title': _('Match-set'),
								}, set),
								E('td', {
									'class'     : 'td left',
									'data-title': _('Description'),
								}, this.formatRuleDescription(set)),
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
						'style': 'width:100%',
					}, this.makeDnsmasqTable(nft_data.dnsmasq, _('Dnsmasq')));
					dnsmasq = rdTableWrapper;
				};

				if(nft_data.dnsmasq_user_instances) {
					let rdsTableWrapper = E('div', {
						'id'   : 'rdsTableWrapper',
						'style': 'width:100%',
					});

					for(let i of nft_data.dnsmasq_user_instances) {
						rdsTableWrapper.append(this.makeDnsmasqTable(i[1], _('Dnsmasq') + ' ' + i[0]));
					};

					if(nft_data.dnsmasq_user_instances.length > 0) {
						dnsmasqUserInstances = rdsTableWrapper;
					};
				};

				if(nft_data.dnsmasq_bypass) {
					let rdbTableWrapper = E('div', {
						'id'   : 'rdbTableWrapper',
						'style': 'width:100%',
					}, this.makeDnsmasqTable(nft_data.dnsmasq_bypass, _('Dnsmasq bypass')));
					dnsmasqBypass = rdbTableWrapper;
				};

				poll.add(L.bind(this.pollInfo, this), this.pollInterval);
			} else {
				update_status = E('em', {}, _('Status') + ' : ' + _('disabled'));
			};
		};

		let layout = [
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
		];

		if(user_entries) {
			layout.splice(3, 0,
				E('div', { 'class': 'cbi-section fade-in' }, [
					E('h3', {}, _('User entries')),
					E('div', { 'class': 'cbi-section-node' }, user_entries),
				])
			);
		}

		if(dnsmasqBypass) {
			layout.splice(5, 0,
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, dnsmasqBypass)
				)
			);
		};

		if(dnsmasqUserInstances) {
			layout.splice(6, 0,
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, dnsmasqUserInstances)
				)
			);
		};

		if(dnsmasq) {
			layout.splice(7, 0,
				E('div', { 'class': 'cbi-section fade-in' },
					E('div', { 'class': 'cbi-section-node' }, dnsmasq)
				)
			);
		};

		return E(layout);
	},

	handleSave     : null,
	handleSaveApply: null,
	handleReset    : null,
});
