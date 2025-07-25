#!/bin/sh

PREFIX=""
TOR_USER="tor"

PROXY_MODE=1
BLACKLIST=0
LUA_MODULE=0
LUCI_APP=1
HTTPS_DNS_PROXY=1

OWRT_VERSION="current"
RUAB_VERSION="2.1.6-r3"
RUAB_MOD_LUA_VERSION="2.1.6-r1"
RUAB_LUCI_APP_VERSION="2.1.6-r3"
BASE_URL="https://raw.githubusercontent.com/gSpotx2f/packages-openwrt/master"
PKG_DIR="/tmp"

if [ -n "$1" ]; then
    OWRT_VERSION="$1"
fi

### URLs

### packages
URL_RUAB_PKG="${BASE_URL}/${OWRT_VERSION}/ruantiblock_${RUAB_VERSION}_all.ipk"
URL_MOD_LUA_PKG="${BASE_URL}/${OWRT_VERSION}/ruantiblock-mod-lua_${RUAB_MOD_LUA_VERSION}_all.ipk"
URL_LUCI_APP_PKG="${BASE_URL}/${OWRT_VERSION}/luci-app-ruantiblock_${RUAB_LUCI_APP_VERSION}_all.ipk"
URL_LUCI_APP_RU_PKG="${BASE_URL}/${OWRT_VERSION}/luci-i18n-ruantiblock-ru_${RUAB_LUCI_APP_VERSION}_all.ipk"
### tor
URL_TORRC="https://raw.githubusercontent.com/gSpotx2f/ruantiblock_openwrt/master/tor/etc/tor/torrc"
URL_LUA_IDN="https://raw.githubusercontent.com/haste/lua-idn/master/idn.lua"

### Local files

CONFIG_DIR="${PREFIX}/etc/ruantiblock"
USER_LISTS_DIR="${CONFIG_DIR}/user_lists"
EXEC_DIR="${PREFIX}/usr/bin"
BACKUP_DIR="${CONFIG_DIR}/autoinstall.bak.$(date +%s)"
### packages
FILE_RUAB_PKG="${PKG_DIR}/ruantiblock_${RUAB_VERSION}_all.ipk"
FILE_MOD_LUA_PKG="${PKG_DIR}/ruantiblock-mod-lua_${RUAB_MOD_LUA_VERSION}_all.ipk"
FILE_LUCI_APP_PKG="${PKG_DIR}/luci-app-ruantiblock_${RUAB_LUCI_APP_VERSION}_all.ipk"
FILE_LUCI_APP_RU_PKG="${PKG_DIR}/luci-i18n-ruantiblock-ru_${RUAB_LUCI_APP_VERSION}_all.ipk"
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
FILE_LUA_IDN="${PREFIX}/usr/lib/lua/idn.lua"

AWK_CMD="awk"
WGET_CMD="$(which wget)"
if [ $? -ne 0 ]; then
    echo " Error! wget doesn't exists" >&2
    exit 1
fi
WGET_PARAMS="--no-check-certificate -q -O "
OPKG_CMD="$(which opkg)"
if [ $? -ne 0 ]; then
    echo " Error! opkg doesn't exists" >&2
    exit 1
fi
UCI_CMD="$(which uci)"
if [ $? -ne 0 ]; then
    echo " Error! uci doesn't exists" >&2
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

ChmodExec() {
    chmod 755 "$1"
}

RemoveFile() {
    if [ -e "$1" ]; then
        echo "Removing ${1}"
        rm -f "$1"
    fi
}

DlFile() {
    local _dir _file
    if [ -n "$2" ]; then
        _dir=$(dirname "$2")
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
    [ -e "$1" ] && cp -f "$1" "${1}.bak.$(date +%s)"
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

RunAtStartup() {
    $FILE_INIT_SCRIPT enable
}

AppStop() {
    FileExists "$FILE_MAIN_SCRIPT" && $FILE_MAIN_SCRIPT destroy
}

AppStart() {
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

UpdatePackagesList() {
    $OPKG_CMD update
}

InstallPackages() {
    local _pkg
    for _pkg in $@
    do
        if [ -z "$($OPKG_CMD list-installed $_pkg)" ]; then
            $OPKG_CMD --force-overwrite install $_pkg
            if [ $? -ne 0 ]; then
                echo "Error during installation of the package (${_pkg})" >&2
                exit 1
            fi
        fi
    done
}

InstallBaseConfig() {
    _return_code=1
    InstallPackages "dnsmasq-full" "kmod-nft-tproxy"
    RemoveFile "$FILE_RUAB_PKG" > /dev/null
    DlFile "$URL_RUAB_PKG" "$FILE_RUAB_PKG" && $OPKG_CMD install "$FILE_RUAB_PKG" > /dev/null
    _return_code=$?
    AppStop
    return $_return_code
}

EnableBlacklist() {
    $UCI_CMD set ruantiblock.config.bllist_preset="ruantiblock-fqdn"
    $UCI_CMD commit ruantiblock
}

InstallVPNConfig() {
    local _if_vpn
    $UCI_CMD set ruantiblock.config.proxy_mode="2"
    $UCI_CMD set ruantiblock.config.if_vpn="tun0"
    $UCI_CMD commit ruantiblock
}

InstallTPConfig() {
    local _if_vpn
    $UCI_CMD set ruantiblock.config.proxy_mode="3"
    $UCI_CMD commit ruantiblock
}

TorrcSettings() {
    local _lan_ip=$($UCI_CMD get network.lan.ipaddr | $AWK_CMD -F "/" '{print $1}')
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
    InstallPackages "tor" "tor-geoip"
    BackupFile "$FILE_TORRC"
    DlFile "$URL_TORRC" "$FILE_TORRC"
    TorrcSettings
    $UCI_CMD set ruantiblock.config.proxy_mode="1"
    $UCI_CMD commit ruantiblock
    # dnsmasq rebind protection
    $UCI_CMD add_list dhcp.@dnsmasq[0].rebind_domain='onion'
    $UCI_CMD commit dhcp
}

InstallLuaModule() {
    InstallPackages "lua" "luasocket" "luasec" "luabitop"
    RemoveFile "$FILE_MOD_LUA_PKG" > /dev/null
    DlFile "$URL_MOD_LUA_PKG" "$FILE_MOD_LUA_PKG" && $OPKG_CMD install "$FILE_MOD_LUA_PKG"
    FileExists "$FILE_LUA_IDN" || DlFile "$URL_LUA_IDN" "$FILE_LUA_IDN"
    $UCI_CMD set ruantiblock.config.bllist_module="/usr/libexec/ruantiblock/ruab_parser.lua"
    $UCI_CMD commit ruantiblock
}

InstallLuciApp() {
    RemoveFile "$FILE_LUCI_APP_PKG" > /dev/null
    RemoveFile "$FILE_LUCI_APP_RU_PKG" > /dev/null
    DlFile "$URL_LUCI_APP_PKG" "$FILE_LUCI_APP_PKG" && $OPKG_CMD install "$FILE_LUCI_APP_PKG" && \
    DlFile "$URL_LUCI_APP_RU_PKG" "$FILE_LUCI_APP_RU_PKG" && $OPKG_CMD install "$FILE_LUCI_APP_RU_PKG"
    rm -f /tmp/luci-modulecache/* /tmp/luci-indexcache*
    /etc/init.d/rpcd restart
    /etc/init.d/uhttpd restart
}

InstallHttpsDnsProxy() {
    InstallPackages "https-dns-proxy" "luci-app-https-dns-proxy" "luci-i18n-https-dns-proxy-ru"
}

PrintBold() {
    printf "\033[1m - ${1}\033[0m\n"
}

InputError () {
    printf "\033[1;31m Wrong input! Try again...\033[m\n"; $1
}

ConfirmProxyMode() {
    local _reply
    printf " Select configuration [ 1: Tor | 2: VPN | 3: Transparent proxy ] (default: 1, quit: q) > "
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
        3)
            PROXY_MODE=3
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

ConfirmBlacklist() {
    local _reply
    printf " Select blacklist [ 1: User entries only | 2: Full blacklist ] (default: 1, quit: q) > "
    read _reply
    case $_reply in
        1|"")
            BLACKLIST=1
            break
        ;;
        2)
            BLACKLIST=2
            break
        ;;
        q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmBlacklist
        ;;
    esac
}

ConfirmLuaModule() {
    local _reply
    printf " Would you like to install the lua module? [ y | n ] (default: y, quit: q) > "
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
    printf " Would you like to install the LuCI application? [ y | n ] (default: y, quit: q) > "
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

ConfirmHttpsDnsProxy() {
    local _reply
    printf " Would you like to install the https-dns-proxy? [ y | n ] (default: y, quit: q) > "
    read _reply
    case $_reply in
        y|Y|"")
            HTTPS_DNS_PROXY=1
            break
        ;;
        n|N)
            HTTPS_DNS_PROXY=0
            break
        ;;
        q|Q)
            printf "Bye...\n"; exit 0
        ;;
        *)
            InputError ConfirmHttpsDnsProxy
        ;;
    esac
}

ConfirmProcessing() {
    local _reply
    printf " Next, the installation will begin... Continue? [ y | n ] (default: y, quit: q) > "
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
ConfirmBlacklist
#ConfirmLuaModule
ConfirmLuciApp
ConfirmHttpsDnsProxy
ConfirmProcessing
AppStop
PrintBold "Updating packages list..."
UpdatePackagesList
PrintBold "Saving current configuration..."
#BackupCurrentConfig
PrintBold "Installing basic configuration..."
InstallBaseConfig
if [ $? -eq 0 ]; then

    if [ $PROXY_MODE = 2 ]; then
        PrintBold "Installing VPN configuration..."
        InstallVPNConfig
    elif [ $PROXY_MODE = 3 ]; then
        PrintBold "Installing transparent proxy configuration..."
        InstallTPConfig
    else
        PrintBold "Installing Tor configuration..."
        InstallTorConfig
        if $(/etc/init.d/tor enabled); then
            /etc/init.d/tor restart
        fi
    fi

    if [ $BLACKLIST = 2 ]; then
        PrintBold "Set full blacklist..."
        EnableBlacklist
    fi

    if [ $LUA_MODULE = 1 ]; then
        PrintBold "Installing lua module..."
        InstallLuaModule
    fi

    if [ $LUCI_APP = 1 ]; then
        PrintBold "Installing luci app..."
        InstallLuciApp
    fi

    if [ $HTTPS_DNS_PROXY = 1 ]; then
        PrintBold "Installing https-dns-proxy..."
        InstallHttpsDnsProxy
    fi

    RunAtStartup
    SetCronTask
else
    PrintBold "An error occurred while installing the ruantiblock package!"
fi

exit 0
