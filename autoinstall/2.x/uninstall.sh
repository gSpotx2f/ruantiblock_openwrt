#!/bin/sh

PREFIX=""

### Local files

CONFIG_DIR="${PREFIX}/etc/ruantiblock"
USER_LISTS_DIR="${CONFIG_DIR}/user_lists"
EXEC_DIR="${PREFIX}/usr/bin"
BACKUP_DIR="${CONFIG_DIR}/autoinstall.bak.$(date +%s)"
HTDOCS_VIEW="${PREFIX}/www/luci-static/resources/view"
HTDOCS_RUAB="${HTDOCS_VIEW}/ruantiblock"
CRONTAB_FILE="/etc/crontabs/root"
DATA_DIR="/tmp/ruantiblock"
DNSMASQ_DATA_FILE="/tmp/dnsmasq*.d/02-ruantiblock.dnsmasq"
DNSMASQ_DATA_FILE_TMP="${DNSMASQ_DATA_FILE}.tmp"
DNSMASQ_DATA_FILE_BYPASS="/tmp/dnsmasq*.d/00-ruantiblock_bypass.dnsmasq"
DNSMASQ_DATA_FILE_USER_INSTANCES="/tmp/dnsmasq*.d/01-ruantiblock_user_instances.dnsmasq"
SCRIPTS_DIR="/usr/share/ruantiblock"
MODULES_DIR="/usr/libexec/ruantiblock"
### ruantiblock
FILE_CONFIG="${CONFIG_DIR}/ruantiblock.conf"
FILE_FQDN_FILTER="${CONFIG_DIR}/fqdn_filter"
FILE_IP_FILTER="${CONFIG_DIR}/ip_filter"
FILE_USER_ENTRIES="${CONFIG_DIR}/user_entries"
FILE_BYPASS_ENTRIES="${CONFIG_DIR}/bypass_entries"
FILE_GR_EXCLUDED_SLD="${CONFIG_DIR}/gr_excluded_sld"
FILE_GR_EXCLUDED_NETS="${CONFIG_DIR}/gr_excluded_nets"
FILE_UCI_CONFIG="${PREFIX}/etc/config/ruantiblock"
FILE_INIT_SCRIPT="${PREFIX}/etc/init.d/ruantiblock"
FILE_MAIN_SCRIPT="${EXEC_DIR}/ruantiblock"
### tor
FILE_TORRC="${PREFIX}/etc/tor/torrc"

AWK_CMD="awk"
OPKG_CMD="$(which opkg)"
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
    for _file in $(ls -1 "$CONFIG_DIR" | grep -v "$(basename $BACKUP_DIR)")
    do
        cp -af "${CONFIG_DIR}/${_file}" "${BACKUP_DIR}/${_file}"
    done
    for _file in "$FILE_UCI_CONFIG" "$FILE_TORRC"
    do
        [ -e "$_file" ] && cp -af "$_file" "${BACKUP_DIR}/$(basename ${_file})"
    done
}

AppStop() {
    FileExists "$FILE_MAIN_SCRIPT" && $FILE_MAIN_SCRIPT destroy
}

DisableStartup() {
    FileExists "$FILE_INIT_SCRIPT" && $FILE_INIT_SCRIPT disable
}

RemoveCronTask() {
    if [ -e "$CRONTAB_FILE" ]; then
        $AWK_CMD -v FILE_MAIN_SCRIPT="$FILE_MAIN_SCRIPT" '$0 !~ FILE_MAIN_SCRIPT {
            print $0;
        }' "$CRONTAB_FILE" > "${CRONTAB_FILE}.tmp" && mv -f "${CRONTAB_FILE}.tmp" "$CRONTAB_FILE"
        /etc/init.d/cron restart
    fi
}

RestoreTorConfig() {
    [ -e "${FILE_TORRC}.bak" ] && mv -f "${FILE_TORRC}.bak" "$FILE_TORRC"
    if [ -x "/etc/init.d/tor" ]; then
        if $(/etc/init.d/tor enabled); then
            /etc/init.d/tor restart
        fi
    fi
}

RemoveAppFiles() {
    RestoreTorConfig
    $OPKG_CMD remove ruantiblock-mod-py ruantiblock-mod-lua luci-i18n-ruantiblock-ru luci-app-ruantiblock ruantiblock
    RemoveFile "$FILE_UCI_CONFIG"
    RemoveFile "$FILE_CONFIG"
    RemoveFile "$FILE_FQDN_FILTER"
    RemoveFile "$FILE_IP_FILTER"
    RemoveFile "$FILE_USER_ENTRIES"
    RemoveFile "$FILE_BYPASS_ENTRIES"
    RemoveFile "$FILE_GR_EXCLUDED_SLD"
    RemoveFile "$FILE_GR_EXCLUDED_NETS"
    RemoveFile "${FILE_UCI_CONFIG}.opkg"
    RemoveFile "${FILE_CONFIG}.opkg"
    RemoveFile "${FILE_FQDN_FILTER}.opkg"
    RemoveFile "${FILE_IP_FILTER}.opkg"
    RemoveFile "${FILE_USER_ENTRIES}.opkg"
    RemoveFile "${FILE_BYPASS_ENTRIES}.opkg"
    rm -f "$DNSMASQ_DATA_FILE"
    rm -f "$DNSMASQ_DATA_FILE_BYPASS"
    rm -f "$DNSMASQ_DATA_FILE_USER_INSTANCES"
    rm -rf "$DATA_DIR"/*
    rm -rf "$USER_LISTS_DIR"
    rmdir "$SCRIPTS_DIR" "$MODULES_DIR" 2> /dev/null
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
RemoveAppFiles

exit 0
