'use strict';
'require view.ruantiblock.log-abstract as abc';
'require view.ruantiblock.tools as tools';

return abc.view.extend({
	viewName   : 'ruantiblock',
	title      : _('Ruantiblock') + ' - ' + _('Log'),
	autoRefresh: false,
	appPattern : tools.appName + ':',
});
