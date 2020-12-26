#!/bin/sh

PREFIX=""
TOR_USER="tor"

PROXY_MODE=1
RAM_CONFIG=0
LUA_MODULE=1
LUCI_APP=1

### ruantiblock
URL_CONFIG="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/ruantiblock/ruantiblock.conf"
URL_FQDN_FILTER="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/ruantiblock/fqdn_filter"
URL_CONFIG_SCRIPT="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/ruantiblock/scripts/config_script"
URL_INFO_OUTPUT="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/ruantiblock/scripts/info_output"
URL_IPT_FUNCTIONS="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/ruantiblock/scripts/ipt_functions"
URL_START_SCRIPT="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/ruantiblock/scripts/start_script"
URL_UCI_CONFIG="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/config/ruantiblock"
URL_INIT_SCRIPT="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/init.d/ruantiblock"
URL_MAIN_SCRIPT="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/usr/bin/ruantiblock"
URL_VPN_UP="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock/files/etc/hotplug.d/iface/40-ruantiblock"
### tor
URL_TORRC="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/tor/etc/tor/torrc"
### ruantiblock-mod-lua
URL_PARSER_LUA="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock-mod-lua/files/usr/bin/ruab_parser.lua"
URL_LUA_IPTOOL="https://raw.githubusercontent.com/gSpotx2f/iptool-lua/master/5.1/iptool.lua"
URL_LUA_SUM_IP="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/ruantiblock-mod-lua/files/usr/lib/lua/ruab_sum_ip.lua"
URL_LUA_IDN="https://raw.githubusercontent.com/haste/lua-idn/master/idn.lua"
### luci-app-ruantiblock
URL_LUCI_CONTROLLER="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/luasrc/controller/ruantiblock.lua"
URL_LUCI_MENU="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/root/usr/share/luci/menu.d/luci-app-ruantiblock.json"
URL_LUCI_RPCD_ACL="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/root/usr/share/rpcd/acl.d/luci-app-ruantiblock.json"
URL_LUCI_JS_CRON="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/ruantiblock/cron.js"
URL_LUCI_JS_INFO="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/ruantiblock/info.js"
URL_LUCI_JS_SERVICE="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/ruantiblock/service.js"
URL_LUCI_JS_SETTINGS="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/ruantiblock/settings.js"
URL_LUCI_JS_TOOLS="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/ruantiblock/tools.js"
URL_LUCI_JS_LOG="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/ruantiblock/log.js"
URL_LUCI_JS_STATUS="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/luci-app-ruantiblock/htdocs/luci-static/resources/view/status/include/80_ruantiblock.js"
URL_LUCI_I18N_RU="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/translations/ruantiblock.ru.lmo"

RUAB_CFG_DIR="${PREFIX}/etc/ruantiblock"
EXEC_DIR="${PREFIX}/usr/bin"
LUCI_ROOT="${PREFIX}/usr/lib/lua/luci"
HTDOCS_VIEW="${PREFIX}/www/luci-static/resources/view"
HTDOCS_RUAB="${HTDOCS_VIEW}/ruantiblock"
BACKUP_DIR="${RUAB_CFG_DIR}/autoinstall.bak"
DATA_DIR="${RUAB_CFG_DIR}/var"
DATA_DIR_RAM="/var/ruantiblock"
RC_LOCAL="/etc/rc.local"

### ruantiblock
FILE_CONFIG="${RUAB_CFG_DIR}/ruantiblock.conf"
FILE_FQDN_FILTER="${RUAB_CFG_DIR}/fqdn_filter"
FILE_IP_FILTER="${RUAB_CFG_DIR}/ip_filter"
FILE_USER_ENTRIES="${RUAB_CFG_DIR}/user_entries"
FILE_CONFIG_SCRIPT="${RUAB_CFG_DIR}/scripts/config_script"
FILE_INFO_OUTPUT="${RUAB_CFG_DIR}/scripts/info_output"
FILE_IPT_FUNCTIONS="${RUAB_CFG_DIR}/scripts/ipt_functions"
FILE_START_SCRIPT="${RUAB_CFG_DIR}/scripts/start_script"
FILE_UCI_CONFIG="${PREFIX}/etc/config/ruantiblock"
FILE_INIT_SCRIPT="${PREFIX}/etc/init.d/ruantiblock"
FILE_MAIN_SCRIPT="${EXEC_DIR}/ruantiblock"
FILE_VPN_UP="${PREFIX}/etc/hotplug.d/iface/40-ruantiblock"
### tor
FILE_TORRC="${PREFIX}/etc/tor/torrc"
### ruantiblock-mod-lua
FILE_PARSER_LUA="${EXEC_DIR}/ruab_parser.lua"
FILE_LUA_IPTOOL="${PREFIX}/usr/lib/lua/iptool.lua"
FILE_LUA_SUM_IP="${PREFIX}/usr/lib/lua/ruab_sum_ip.lua"
FILE_LUA_IDN="${PREFIX}/usr/lib/lua/idn.lua"
### luci-app-ruantiblock
FILE_LUCI_CONTROLLER="${LUCI_ROOT}/controller/ruantiblock.lua"
FILE_LUCI_I18N_RU="${LUCI_ROOT}/i18n/ruantiblock.ru.lmo"
FILE_LUCI_MENU="${PREFIX}/usr/share/luci/menu.d/luci-app-ruantiblock.json"
FILE_LUCI_RPCD_ACL="${PREFIX}/usr/share/rpcd/acl.d/luci-app-ruantiblock.json"
FILE_LUCI_JS_CRON="${HTDOCS_RUAB}/cron.js"
FILE_LUCI_JS_INFO="${HTDOCS_RUAB}/info.js"
FILE_LUCI_JS_SERVICE="${HTDOCS_RUAB}/service.js"
FILE_LUCI_JS_SETTINGS="${HTDOCS_RUAB}/settings.js"
FILE_LUCI_JS_TOOLS="${HTDOCS_RUAB}/tools.js"
FILE_LUCI_JS_LOG="${HTDOCS_RUAB}/log.js"
FILE_LUCI_JS_STATUS="${HTDOCS_VIEW}/status/include/80_ruantiblock.js"

AWK_CMD="awk"
WGET_CMD=`which wget`
if [ $? -ne 0 ]; then
    echo " Error! wget doesn't exists" >&2
    exit 1
fi
WGET_PARAMS="--no-check-certificate -q -O "
OPKG_CMD=`which opkg`
if [ $? -ne 0 ]; then
    echo " Error! opkg doesn't exists" >&2
    exit 1
fi
UCI_CMD=`which uci`
if [ $? -ne 0 ]; then
    echo " Error! uci doesn't exists" >&2
    exit 1
fi

InstallPackages() {
    local _pkg
    for _pkg in $@
    do
        if [ -z "`$OPKG_CMD list-installed $_pkg`" ]; then
            $OPKG_CMD --force-overwrite install $_pkg
            if [ $? -ne 0 ]; then
                echo "Error during installation of the package (${_pkg})" >&2
                exit 1
            fi
        fi
    done
}

FileExists() {
    test -e "$1"
}

MakeDir() {
    [ -d "$1" ] || mkdir -p "$1"
    if [ $? -ne 0 ]; then
        echo "Error! Can't create directory (${1})" >&2
        exit 1
    fi
}

ChmodExec() {
    chmod 755 "$1"
}

UpdatePackagesList() {
    $OPKG_CMD update
}

DlFile() {
    local _dir _file
    if [ -n "$2" ]; then
        _dir=`dirname "$2"`
        MakeDir "$_dir"
        _file="$2"
    else
        _file="-"
    fi
    $WGET_CMD $WGET_PARAMS "$_file" "$1"
    if [ $? -ne 0 ]; then
        echo "Connection error (${1})" >&2
        exit 1
    fi
    echo "Downloading ${1}"
}

BackupFile() {
    [ -e "$1" ] && cp -f "$1" "${1}.bak.`date +%s`"
}

BackupCurrentConfig() {
    local _file
    MakeDir "$BACKUP_DIR"
    for _file in "$FILE_CONFIG" "$FILE_FQDN_FILTER" "$FILE_IP_FILTER" "$FILE_USER_ENTRIES" "$FILE_UCI_CONFIG" "$FILE_TORRC"
    do
        [ -e "$_file" ] && cp -f "$_file" "${BACKUP_DIR}/`basename ${_file}`"
    done
}

InstallBaseConfig() {
    InstallPackages "ipset" "kmod-ipt-ipset" "dnsmasq-full"
    DlFile "$URL_CONFIG" "$FILE_CONFIG"
    DlFile "$URL_FQDN_FILTER" "$FILE_FQDN_FILTER"
    DlFile "$URL_CONFIG_SCRIPT" "$FILE_CONFIG_SCRIPT"
    DlFile "$URL_INFO_OUTPUT" "$FILE_INFO_OUTPUT"
    DlFile "$URL_IPT_FUNCTIONS" "$FILE_IPT_FUNCTIONS"
    DlFile "$URL_START_SCRIPT" "$FILE_START_SCRIPT" && ChmodExec "$FILE_START_SCRIPT"
    DlFile "$URL_UCI_CONFIG" "$FILE_UCI_CONFIG"
    DlFile "$URL_INIT_SCRIPT" "$FILE_INIT_SCRIPT" && ChmodExec "$FILE_INIT_SCRIPT"
    DlFile "$URL_MAIN_SCRIPT" "$FILE_MAIN_SCRIPT" && ChmodExec "$FILE_MAIN_SCRIPT"
    DlFile "$URL_VPN_UP" "$FILE_VPN_UP" && ChmodExec "$FILE_VPN_UP"
}

InstallVPNConfig() {
    local _if_vpn
    $UCI_CMD set ruantiblock.config.proxy_mode="2"
    _if_vpn=`$UCI_CMD get network.VPN.ifname`
    if [ -z "$_if_vpn" ]; then
        _if_vpn="tun0"
    fi
    $UCI_CMD set ruantiblock.config.if_vpn="$_if_vpn"
    $UCI_CMD commit
}

TorrcSettings() {
    local _lan_ip=`$UCI_CMD get network.lan.ipaddr | $AWK_CMD -F "/" '{print $1}'`
    if [ -z "$_lan_ip" ]; then
        _lan_ip="0.0.0.0"
    fi
    $AWK_CMD -v lan_ip="$_lan_ip" -v TOR_USER="$TOR_USER" '{
            if($0 ~ /^([#]?TransPort|[#]?TransListenAddress|[#]?SOCKSPort)/ && $0 !~ "127.0.0.1") sub(/([0-9]{1,3}.){3}[0-9]{1,3}/, lan_ip, $0);
            else if($0 ~ /^User/) $2 = TOR_USER;
            print $0;
        }' "$FILE_TORRC" > "${FILE_TORRC}.tmp" && mv -f "${FILE_TORRC}.tmp" "$FILE_TORRC"
}

InstallTorConfig() {
    local _if_lan
    InstallPackages "tor" "tor-geoip"
    BackupFile "$FILE_TORRC"
    DlFile "$URL_TORRC" "$FILE_TORRC"
    TorrcSettings
    $UCI_CMD set ruantiblock.config.proxy_mode="1"
    _if_lan=`$UCI_CMD get network.lan.ifname`
    if [ -z "$_if_lan" ]; then
        _if_lan="eth0"
    fi
    $UCI_CMD set ruantiblock.config.if_lan="$_if_lan"
    $UCI_CMD commit
}

RamConfigPrepare() {
    $AWK_CMD -v DATA_DIR_RAM="$DATA_DIR_RAM" '{
        sub(/^DATA_DIR=.*$/, "DATA_DIR=\"" DATA_DIR_RAM "\"");
        print $0;
    }' "$FILE_CONFIG" > "${FILE_CONFIG}.tmp" && mv -f "${FILE_CONFIG}.tmp" "$FILE_CONFIG"
    $AWK_CMD -v FILE_MAIN_SCRIPT="$FILE_MAIN_SCRIPT" '{
        if($0 ~ /^exit 0/) next;
        print $0;
    } END { print FILE_MAIN_SCRIPT " update\nexit 0" }' "$RC_LOCAL" > "${RC_LOCAL}.tmp" && mv -f "${RC_LOCAL}.tmp" "$RC_LOCAL"
}

InstallLuaModule() {
    InstallPackages "lua" "luasocket" "luasec" "luabitop"
    DlFile "$URL_PARSER_LUA" "$FILE_PARSER_LUA" && ChmodExec "$FILE_PARSER_LUA"
    DlFile "$URL_LUA_IPTOOL" "$FILE_LUA_IPTOOL"
    DlFile "$URL_LUA_SUM_IP" "$FILE_LUA_SUM_IP"
    FileExists "$FILE_LUA_IDN" || DlFile "$URL_LUA_IDN" "$FILE_LUA_IDN"
    $UCI_CMD set ruantiblock.config.bllist_module="/usr/bin/ruab_parser.lua"
    $UCI_CMD commit
}

InstallLuciApp() {
    InstallPackages "luci-mod-rpc" "rpcd-mod-luci" "uhttpd-mod-ubus"
    DlFile "$URL_LUCI_CONTROLLER" "$FILE_LUCI_CONTROLLER"
    DlFile "$URL_LUCI_I18N_RU" "$FILE_LUCI_I18N_RU"
    DlFile "$URL_LUCI_MENU" "$FILE_LUCI_MENU"
    DlFile "$URL_LUCI_RPCD_ACL" "$FILE_LUCI_RPCD_ACL"
    DlFile "$URL_LUCI_JS_CRON" "$FILE_LUCI_JS_CRON"
    DlFile "$URL_LUCI_JS_INFO" "$FILE_LUCI_JS_INFO"
    DlFile "$URL_LUCI_JS_SERVICE" "$FILE_LUCI_JS_SERVICE"
    DlFile "$URL_LUCI_JS_SETTINGS" "$FILE_LUCI_JS_SETTINGS"
    DlFile "$URL_LUCI_JS_TOOLS" "$FILE_LUCI_JS_TOOLS"
    DlFile "$URL_LUCI_JS_LOG" "$FILE_LUCI_JS_LOG"
    DlFile "$URL_LUCI_JS_STATUS" "$FILE_LUCI_JS_STATUS"
    rm -f /tmp/luci-modulecache/*
    rm -f /tmp/luci-indexcache
    /etc/init.d/rpcd restart
    /etc/init.d/uhttpd restart
}

RunAtStartup() {
    $FILE_INIT_SCRIPT enable
}

AppStop() {
    FileExists "$FILE_MAIN_SCRIPT" && $FILE_MAIN_SCRIPT destroy
}

AppStart() {
    modprobe ip_set > /dev/null
    modprobe ip_set_hash_ip > /dev/null
    modprobe ip_set_hash_net > /dev/null
    modprobe ip_set_list_set > /dev/null
    modprobe xt_set > /dev/null
    $FILE_INIT_SCRIPT start
}

SetCronTask() {
    echo "0 3 */3 * * ${FILE_MAIN_SCRIPT} update" >> /etc/crontabs/root
    /etc/init.d/cron restart 2> /dev/null
    /etc/init.d/cron enable
}

Reboot() {
    reboot
}

PrintBold() {
    printf "\033[1m - ${1}\033[0m\n"
}

InputError () {
    printf "\033[1;31m Wrong input! Try again...\033[m\n"; $1
}

ConfirmProxyMode() {
    local _reply
    printf " Select configuration [1: Tor | 2: VPN] (default: 1, quit: q) > "
    read _reply
    case $_reply in
        1|"")
            PROXY_MODE=1
            break
        ;;
        2)
            PROXY_MODE=2
            break
        ;;
        q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmProxyMode
        ;;
    esac
}

ConfirmRamConfig() {
    local _reply
    printf " Would you like to set the RAM-configuration? [y|n] (default: n, quit: q) > "
    read _reply
    case $_reply in
        y|Y)
            RAM_CONFIG=1
            break
        ;;
        n|N|"")
            RAM_CONFIG=0
            break
        ;;
        q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmRamConfig
        ;;
    esac
}

ConfirmLuaModule() {
    local _reply
    printf " Would you like to install the lua module? [y|n] (default: y, quit: q) > "
    read _reply
    case $_reply in
        y|Y|"")
            LUA_MODULE=1
            break
        ;;
        n|N)
            LUA_MODULE=0
            break
        ;;
        q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmLuaModule
        ;;
    esac
}

ConfirmLuciApp() {
    local _reply
    printf " Would you like to install the LuCI application? [y|n] (default: y, quit: q) > "
    read _reply
    case $_reply in
        y|Y|"")
            LUCI_APP=1
            break
        ;;
        n|N)
            LUCI_APP=0
            break
        ;;
        q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmLuciApp
        ;;
    esac
}

ConfirmProcessing() {
    local _reply
    printf " Next, the installation will begin... Continue? [y|n] (default: y, quit: q) > "
    read _reply
    case $_reply in
        y|Y|"")
            break
        ;;
        n|N|q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmLuciApp
        ;;
    esac
}

ConfirmProxyMode
ConfirmRamConfig
ConfirmLuciApp
ConfirmProcessing

AppStop
PrintBold "Updating packages list..."
UpdatePackagesList
PrintBold "Saving current configuration..."
BackupCurrentConfig
PrintBold "Installing basic configuration..."
InstallBaseConfig

if [ $PROXY_MODE = 2 ]; then
    PrintBold "Installing VPN configuration..."
    InstallVPNConfig
else
    PrintBold "Installing Tor configuration..."
    InstallTorConfig
    if `/etc/init.d/tor enabled`; then
        /etc/init.d/tor restart
    fi
fi

if [ $RAM_CONFIG = 1 ]; then
    PrintBold "Setting the RAM-configuration..."
    RamConfigPrepare
fi

if [ $LUA_MODULE = 1 ]; then
    PrintBold "Installing lua module..."
    InstallLuaModule
fi

if [ $LUCI_APP = 1 ]; then
    PrintBold "Installing luci app..."
    InstallLuciApp
fi

RunAtStartup
SetCronTask

exit 0
