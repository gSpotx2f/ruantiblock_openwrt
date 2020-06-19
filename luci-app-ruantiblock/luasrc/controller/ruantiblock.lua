
module('luci.controller.ruantiblock', package.seeall)

function index()
    if nixio.fs.access('/etc/config/ruantiblock') and nixio.fs.access('/usr/bin/ruantiblock') then
        entry({'admin', 'services', 'ruantiblock'}, firstchild(), _('Ruantiblock'), 60).acl_depends = { 'luci-app-ruantiblock' }
        entry({'admin', 'services', 'ruantiblock', 'service'}, view('ruantiblock/service'), _('Service'), 10)
        entry({'admin', 'services', 'ruantiblock', 'settings'}, view('ruantiblock/settings'), _('Settings'), 20)
        entry({'admin', 'services', 'ruantiblock', 'cron'}, view('ruantiblock/cron'), _('Blacklist updates'), 30)
        entry({'admin', 'services', 'ruantiblock', 'info'}, view('ruantiblock/info'), _('Statistics'), 40)
        entry({'admin', 'services', 'ruantiblock', 'log'}, view('ruantiblock/log'), _('Log'), 50)
    end
end
