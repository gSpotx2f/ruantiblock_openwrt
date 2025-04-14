'use strict';
'require view.ruantiblock.log-system as abc';
'require view.ruantiblock.tools as tools';

return abc.view.extend({
	viewName         : 'ruantiblock',
	title            : _('Ruantiblock') + ' - ' + _('Log'),
	enableAutoRefresh: false,
	appPattern       : tools.appName + ':',
});
