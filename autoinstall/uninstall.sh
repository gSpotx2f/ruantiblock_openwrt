#!/bin/sh

PREFIX=""

RUAB_CFG_DIR="${PREFIX}/etc/ruantiblock"
EXEC_DIR="${PREFIX}/usr/bin"
LUCI_ROOT="${PREFIX}/usr/lib/lua/luci"
HTDOCS_VIEW="${PREFIX}/www/luci-static/resources/view"
HTDOCS_RUAB="${HTDOCS_VIEW}/ruantiblock"
CRONTAB_FILE="/etc/crontabs/root"
DATA_DIR="${RUAB_CFG_DIR}/var"
DATA_DIR_RAM="/var/ruantiblock"
RC_LOCAL="/etc/rc.local"
DNSMASQ_CONF_LINK="/tmp/dnsmasq.d/ruantiblock.conf"

### ruantiblock
FILE_CONFIG="${RUAB_CFG_DIR}/ruantiblock.conf"
FILE_FQDN_FILTER="${RUAB_CFG_DIR}/fqdn_filter"
FILE_IP_FILTER="${RUAB_CFG_DIR}/ip_filter"
FILE_USER_ENTRIES="${RUAB_CFG_DIR}/user_entries"
FILE_CONFIG_SCRIPT="${RUAB_CFG_DIR}/scripts/config_script"
FILE_INFO_OUTPUT="${RUAB_CFG_DIR}/scripts/info_output"
FILE_IPT_FUNCTIONS="${RUAB_CFG_DIR}/scripts/ipt_functions"
FILE_START_SCRIPT="${RUAB_CFG_DIR}/scripts/start_script"
FILE_STOP_SCRIPT="${RUAB_CFG_DIR}/scripts/stop_script"
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
### ruantiblock-mod-py
FILE_PARSER_PY="${EXEC_DIR}/ruab_parser.py"
FILE_PY_SUM_IP="${PREFIX}/usr/lib/python3.7/ruab_sum_ip.py"
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

FileExists() {
    test -e "$1"
}

RemoveFile() {
    if [ -e "$1" ]; then
        echo "Removing ${1}"
        rm -f "$1"
    fi
}

RestoreTorConfig() {
    [ -e "${FILE_TORRC}.bak" ] && mv -f "${FILE_TORRC}.bak" "$FILE_TORRC"
    if `/etc/init.d/tor enabled`; then
        /etc/init.d/tor restart
    fi
}

RemoveAppFiles() {
    RestoreTorConfig
    rm -rf "$DATA_DIR"
    rm -rf "$DATA_DIR_RAM"
    RemoveFile "$FILE_VPN_UP"
    RemoveFile "$FILE_CONFIG_SCRIPT"
    RemoveFile "$FILE_INFO_OUTPUT"
    RemoveFile "$FILE_IPT_FUNCTIONS"
    RemoveFile "$FILE_START_SCRIPT"
    RemoveFile "$FILE_STOP_SCRIPT"
    rmdir "${RUAB_CFG_DIR}/scripts" 2> /dev/null
    RemoveFile "$FILE_UCI_CONFIG"
    RemoveFile "$FILE_INIT_SCRIPT"
    RemoveFile "$FILE_MAIN_SCRIPT"
    RemoveFile "$FILE_SEARCH_SCRIPT"
    RemoveFile "$FILE_PARSER_LUA"
    RemoveFile "$FILE_LUA_IPTOOL"
    RemoveFile "$FILE_LUA_SUM_IP"
    RemoveFile "$FILE_PARSER_PY"
    RemoveFile "$FILE_PY_SUM_IP"
    RemoveFile "$FILE_LUCI_CONTROLLER"
    RemoveFile "$FILE_LUCI_I18N_RU"
    RemoveFile "$FILE_LUCI_MENU"
    RemoveFile "$FILE_LUCI_RPCD_ACL"
    RemoveFile "$FILE_LUCI_JS_CRON"
    RemoveFile "$FILE_LUCI_JS_INFO"
    RemoveFile "$FILE_LUCI_JS_SERVICE"
    RemoveFile "$FILE_LUCI_JS_SETTINGS"
    RemoveFile "$FILE_LUCI_JS_TOOLS"
    RemoveFile "$FILE_LUCI_JS_LOG"
    RemoveFile "$FILE_LUCI_JS_STATUS"
    rmdir "$HTDOCS_RUAB" 2> /dev/null
    rm -f /tmp/luci-modulecache/*
    rm -f /tmp/luci-indexcache
    /etc/init.d/rpcd restart
    /etc/init.d/uhttpd restart
}

AppStop() {
    rm -f $DNSMASQ_CONF_LINK
    FileExists "$FILE_MAIN_SCRIPT" && $FILE_MAIN_SCRIPT destroy
}

DisableStartup() {
    FileExists "$FILE_INIT_SCRIPT" && $FILE_INIT_SCRIPT disable
}

RemoveCronTask() {
    $AWK_CMD -v FILE_MAIN_SCRIPT="$FILE_MAIN_SCRIPT" '$0 !~ FILE_MAIN_SCRIPT {
        print $0;
    }' "$CRONTAB_FILE" > "${CRONTAB_FILE}.tmp" && mv -f "${CRONTAB_FILE}.tmp" "$CRONTAB_FILE"
    /etc/init.d/cron restart
}

RemoveRcLocalEntry() {
    $AWK_CMD -v FILE_MAIN_SCRIPT="$FILE_MAIN_SCRIPT" '$0 !~ FILE_MAIN_SCRIPT {
        print $0;
    }' "$RC_LOCAL" > "${RC_LOCAL}.tmp" && mv -f "${RC_LOCAL}.tmp" "$RC_LOCAL"
}

InputError () {
    printf "\033[1;31m Wrong input! Try again...\033[m\n"; $1
}

ConfirmRemove() {
    local _reply
    printf " Files will be removed... Continue? [y|n] (default: y, quit: q) > "
    read _reply
    case $_reply in
        y|Y|"")
            break
        ;;
        n|N|q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmRemove
        ;;
    esac
}

ConfirmRemove
AppStop
DisableStartup
RemoveCronTask
RemoveRcLocalEntry
RemoveAppFiles

exit 0
