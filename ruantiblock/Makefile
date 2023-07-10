#
# (с) 2023 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock
PKG_VERSION:=1.1
PKG_RELEASE:=3
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
/etc/config/ruantiblock
/etc/ruantiblock/ruantiblock.conf
/etc/ruantiblock/fqdn_filter
/etc/ruantiblock/ip_filter
/etc/ruantiblock/user_entries
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
	$(INSTALL_DATA) ./files/etc/ruantiblock/fqdn_filter $(1)/etc/ruantiblock/fqdn_filter
	$(INSTALL_DATA) ./files/etc/ruantiblock/ip_filter $(1)/etc/ruantiblock/ip_filter
	$(INSTALL_DATA) ./files/etc/ruantiblock/user_entries $(1)/etc/ruantiblock/user_entries
	$(INSTALL_DIR) $(1)/usr/share/ruantiblock
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/config_script $(1)/usr/share/ruantiblock/config_script
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/info_output $(1)/usr/share/ruantiblock/info_output
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/nft_functions $(1)/usr/share/ruantiblock/nft_functions
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/ruantiblock $(1)/usr/bin/ruantiblock
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh

FILE_MAIN_SCRIPT="/usr/bin/ruantiblock"

test -e "$$FILE_MAIN_SCRIPT" && $$FILE_MAIN_SCRIPT destroy

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
