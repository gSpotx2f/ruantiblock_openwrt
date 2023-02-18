#
# (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock
PKG_VERSION:=1.1
PKG_RELEASE:=0
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Ruantiblock
  URL:=https://github.com/gSpotx2f/ruantiblock_openwrt
  PKGARCH:=all
  DEPENDS:=+dnsmasq-full
endef

define Package/$(PKG_NAME)/description
endef

define Package/$(PKG_NAME)/conffiles
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/ruantiblock $(1)/etc/config/ruantiblock
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/ruantiblock $(1)/etc/init.d/ruantiblock
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) ./files/etc/hotplug.d/iface/40-ruantiblock $(1)/etc/hotplug.d/iface/40-ruantiblock
	$(INSTALL_DIR) $(1)/etc/ruantiblock
	$(INSTALL_CONF) ./files/etc/ruantiblock/ruantiblock.conf $(1)/etc/ruantiblock/ruantiblock.conf
	$(INSTALL_CONF) ./files/etc/ruantiblock/fqdn_filter $(1)/etc/ruantiblock/fqdn_filter
	$(INSTALL_DIR) $(1)/etc/ruantiblock/scripts
	$(INSTALL_DATA) ./files/etc/ruantiblock/scripts/config_script $(1)/etc/ruantiblock/scripts/config_script
	$(INSTALL_DATA) ./files/etc/ruantiblock/scripts/info_output $(1)/etc/ruantiblock/scripts/info_output
	$(INSTALL_DATA) ./files/etc/ruantiblock/scripts/nft_functions $(1)/etc/ruantiblock/scripts/nft_functions
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/ruantiblock $(1)/usr/bin/ruantiblock
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh

RUAB_CFG_DIR="/etc/ruantiblock"
BACKUP_DIR="$${RUAB_CFG_DIR}/autoinstall.bak.`date +%s`"
FILE_CONFIG="$${RUAB_CFG_DIR}/ruantiblock.conf"
FILE_FQDN_FILTER="$${RUAB_CFG_DIR}/fqdn_filter"
FILE_IP_FILTER="$${RUAB_CFG_DIR}/ip_filter"
FILE_USER_ENTRIES="$${RUAB_CFG_DIR}/user_entries"
FILE_UCI_CONFIG="/etc/config/ruantiblock"
FILE_MAIN_SCRIPT="/usr/bin/ruantiblock"

test -e "$$FILE_MAIN_SCRIPT" && $$FILE_MAIN_SCRIPT destroy

mkdir -p "$$BACKUP_DIR"
for _file in "$$FILE_CONFIG" "$$FILE_FQDN_FILTER" "$$FILE_IP_FILTER" "$$FILE_USER_ENTRIES" "$$FILE_UCI_CONFIG"
do
	[ -e "$$_file" ] && cp -f "$$_file" "$${BACKUP_DIR}/`basename $$_file`"
done

exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh

FILE_INIT_SCRIPT="/etc/init.d/ruantiblock"
FILE_MAIN_SCRIPT="/usr/bin/ruantiblock"
CRONTAB_FILE="/etc/crontabs/root"
DNSMASQ_DATA_FILE="/tmp/dnsmasq.d/ruantiblock.dnsmasq"

rm -f $$DNSMASQ_DATA_FILE
test -e "$$FILE_MAIN_SCRIPT" && $$FILE_MAIN_SCRIPT destroy

test -e "$$FILE_INIT_SCRIPT" && $$FILE_INIT_SCRIPT disable

awk -v FILE_MAIN_SCRIPT="$$FILE_MAIN_SCRIPT" '$$0 !~ FILE_MAIN_SCRIPT {
	print $$0;
}' "$$CRONTAB_FILE" > "$${CRONTAB_FILE}.tmp" && mv -f "$${CRONTAB_FILE}.tmp" "$$CRONTAB_FILE"
/etc/init.d/cron restart

exit 0

endef

$(eval $(call BuildPackage,$(PKG_NAME)))
