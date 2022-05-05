#!/bin/sh

PREFIX=""

### Local files

RUAB_CFG_DIR="${PREFIX}/etc/ruantiblock"
EXEC_DIR="${PREFIX}/usr/bin"
BACKUP_DIR="${RUAB_CFG_DIR}/autoinstall.bak.`date +%s`"
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
FILE_UCI_CONFIG="${PREFIX}/etc/config/ruantiblock"
FILE_INIT_SCRIPT="${PREFIX}/etc/init.d/ruantiblock"
FILE_MAIN_SCRIPT="${EXEC_DIR}/ruantiblock"
### tor
FILE_TORRC="${PREFIX}/etc/tor/torrc"

AWK_CMD="awk"
OPKG_CMD=`which opkg`
if [ $? -ne 0 ]; then
    echo " Error! opkg doesn't exists" >&2
    exit 1
fi

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

RemoveFile() {
    if [ -e "$1" ]; then
        echo "Removing ${1}"
        rm -f "$1"
    fi
}

BackupCurrentConfig() {
    local _file
    MakeDir "$BACKUP_DIR"
    for _file in "$FILE_CONFIG" "$FILE_FQDN_FILTER" "$FILE_IP_FILTER" "$FILE_USER_ENTRIES" "$FILE_UCI_CONFIG" "$FILE_TORRC"
    do
        [ -e "$_file" ] && cp -f "$_file" "${BACKUP_DIR}/`basename ${_file}`"
    done
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

RestoreTorConfig() {
    [ -e "${FILE_TORRC}.bak" ] && mv -f "${FILE_TORRC}.bak" "$FILE_TORRC"
    if [ -x "/etc/init.d/tor" ]; then
        if `/etc/init.d/tor enabled`; then
            /etc/init.d/tor restart
        fi
    fi
}

RemoveAppFiles() {
    RestoreTorConfig
    rm -rf "$DATA_DIR"
    rm -rf "$DATA_DIR_RAM"
    $OPKG_CMD remove ruantiblock-mod-py ruantiblock-mod-lua luci-i18n-ruantiblock-ru luci-app-ruantiblock ruantiblock
    rmdir "${RUAB_CFG_DIR}/scripts" 2> /dev/null
    rmdir "$HTDOCS_RUAB" 2> /dev/null
    rm -f /tmp/luci-modulecache/* /tmp/luci-indexcache*
    /etc/init.d/rpcd restart
    /etc/init.d/uhttpd restart
}

InputError () {
    printf "\033[1;31m Wrong input! Try again...\033[m\n"; $1
}

ConfirmRemove() {
    local _reply
    printf " Application will be removed... Continue? [y|n] (default: y, quit: q) > "
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
BackupCurrentConfig
DisableStartup
RemoveCronTask
RemoveRcLocalEntry
RemoveAppFiles

exit 0
