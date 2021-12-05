#
# (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock
PKG_VERSION:=0.9.0
PKG_RELEASE:=3
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Ruantiblock
	URL:=https://github.com/gSpotx2f/ruantiblock_openwrt
	PKGARCH:=all
	DEPENDS:=+wget +ipset +kmod-ipt-ipset +dnsmasq-full
endef

define Package/$(PKG_NAME)/description

endef

define Package/$(PKG_NAME)/conffiles
	/etc/config/ruantiblock
	/etc/ruantiblock/ruantiblock.conf
	/etc/ruantiblock/fqdn_filter
	/etc/ruantiblock/ip_filter
	/etc/ruantiblock/user_entries
endef

define Build/Prepare
	$(CP) -r ./files $(PKG_BUILD_DIR)/files
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/usr/bin/ruantiblock $(1)/usr/bin/ruantiblock
	$(INSTALL_DIR) $(1)/etc/ruantiblock
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/files/etc/ruantiblock/ruantiblock.conf $(1)/etc/ruantiblock/ruantiblock.conf
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/files/etc/ruantiblock/fqdn_filter $(1)/etc/ruantiblock/fqdn_filter
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/etc/hotplug.d/iface/40-ruantiblock $(1)/etc/hotplug.d/iface/40-ruantiblock
	$(INSTALL_DIR) $(1)/etc/ruantiblock/scripts
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/files/etc/ruantiblock/scripts/config_script $(1)/etc/ruantiblock/scripts/config_script
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/files/etc/ruantiblock/scripts/info_output $(1)/etc/ruantiblock/scripts/info_output
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/files/etc/ruantiblock/scripts/ipt_functions $(1)/etc/ruantiblock/scripts/ipt_functions
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/etc/ruantiblock/scripts/start_script $(1)/etc/ruantiblock/scripts/start_script
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/files/etc/config/ruantiblock $(1)/etc/config/ruantiblock
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/etc/init.d/ruantiblock $(1)/etc/init.d/ruantiblock
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh

RUAB_CFG_DIR="/etc/ruantiblock"
EXEC_DIR="/usr/bin"
BACKUP_DIR="$${RUAB_CFG_DIR}/autoinstall.bak.`date +%s`"
FILE_CONFIG="$${RUAB_CFG_DIR}/ruantiblock.conf"
FILE_FQDN_FILTER="$${RUAB_CFG_DIR}/ruab_fqdn_filter"
FILE_IP_FILTER="$${RUAB_CFG_DIR}/ruab_ip_filter"
FILE_USER_ENTRIES="$${RUAB_CFG_DIR}/ruab_user_entries"
FILE_UCI_CONFIG="/etc/config/ruantiblock"
FILE_MAIN_SCRIPT="$${EXEC_DIR}/ruantiblock"


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

EXEC_DIR="/usr/bin"
FILE_INIT_SCRIPT="/etc/init.d/ruantiblock"
FILE_MAIN_SCRIPT="$${EXEC_DIR}/ruantiblock"
CRONTAB_FILE="/etc/crontabs/root"
RC_LOCAL="/etc/rc.local"
DNSMASQ_CONF_LINK="/tmp/dnsmasq.d/ruantiblock.conf"


rm -f $$DNSMASQ_CONF_LINK
test -e "$$FILE_MAIN_SCRIPT" && $$FILE_MAIN_SCRIPT destroy

test -e "$$FILE_INIT_SCRIPT" && $$FILE_INIT_SCRIPT disable

awk -v FILE_MAIN_SCRIPT="$$FILE_MAIN_SCRIPT" '$$0 !~ FILE_MAIN_SCRIPT {
	print $$0;
}' "$$CRONTAB_FILE" > "$${CRONTAB_FILE}.tmp" && mv -f "$${CRONTAB_FILE}.tmp" "$$CRONTAB_FILE"
/etc/init.d/cron restart

awk -v FILE_MAIN_SCRIPT="$$FILE_MAIN_SCRIPT" '$$0 !~ FILE_MAIN_SCRIPT {
	print $$0;
}' "$$RC_LOCAL" > "$${RC_LOCAL}.tmp" && mv -f "$${RC_LOCAL}.tmp" "$$RC_LOCAL"

exit 0

endef

$(eval $(call BuildPackage,$(PKG_NAME)))
