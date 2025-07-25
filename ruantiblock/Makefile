#
# (с) 2025 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock
PKG_VERSION:=2.1.6
PKG_RELEASE:=3
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Ruantiblock
  URL:=https://github.com/gSpotx2f/ruantiblock_openwrt
  PKGARCH:=all
  DEPENDS:=+dnsmasq-full +kmod-nft-tproxy
endef

define Package/$(PKG_NAME)/description
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/ruantiblock
/etc/ruantiblock/ruantiblock.conf
/etc/ruantiblock/fqdn_filter
/etc/ruantiblock/ip_filter
/etc/ruantiblock/bypass_entries
/etc/ruantiblock/gr_excluded_nets
/etc/ruantiblock/gr_excluded_sld
/etc/ruantiblock/user_lists/list1
/etc/ruantiblock/user_lists/list2
/etc/ruantiblock/user_lists/list3
/etc/ruantiblock/user_lists/list4
/etc/ruantiblock/user_lists/list5
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
	$(INSTALL_DATA) ./files/etc/ruantiblock/bypass_entries $(1)/etc/ruantiblock/bypass_entries
	$(INSTALL_DATA) ./files/etc/ruantiblock/gr_excluded_nets $(1)/etc/ruantiblock/gr_excluded_nets
	$(INSTALL_DATA) ./files/etc/ruantiblock/gr_excluded_sld $(1)/etc/ruantiblock/gr_excluded_sld
	$(INSTALL_DIR) $(1)/etc/ruantiblock/user_lists
	$(INSTALL_DATA) ./files/etc/ruantiblock/user_lists/list1 $(1)/etc/ruantiblock/user_lists/list1
	$(INSTALL_DATA) ./files/etc/ruantiblock/user_lists/list2 $(1)/etc/ruantiblock/user_lists/list2
	$(INSTALL_DATA) ./files/etc/ruantiblock/user_lists/list3 $(1)/etc/ruantiblock/user_lists/list3
	$(INSTALL_DATA) ./files/etc/ruantiblock/user_lists/list4 $(1)/etc/ruantiblock/user_lists/list4
	$(INSTALL_DATA) ./files/etc/ruantiblock/user_lists/list5 $(1)/etc/ruantiblock/user_lists/list5
	$(INSTALL_DIR) $(1)/usr/share/ruantiblock
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/blacklist_sources $(1)/usr/share/ruantiblock/blacklist_sources
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/config_script $(1)/usr/share/ruantiblock/config_script
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/config_script_user_instances $(1)/usr/share/ruantiblock/config_script_user_instances
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/info_output $(1)/usr/share/ruantiblock/info_output
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/nft_functions $(1)/usr/share/ruantiblock/nft_functions
	$(INSTALL_DATA) ./files/usr/share/ruantiblock/user_instances_common $(1)/usr/share/ruantiblock/user_instances_common
	$(INSTALL_DIR) $(1)/usr/libexec/ruantiblock
	$(INSTALL_BIN) ./files/usr/libexec/ruantiblock/ruab_route_check $(1)/usr/libexec/ruantiblock/ruab_route_check
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
DNSMASQ_DATA_FILE_BYPASS="/tmp/dnsmasq*.d/00-ruantiblock_bypass.dnsmasq"
DNSMASQ_DATA_FILE_USER_INSTANCES="/tmp/dnsmasq*.d/01-ruantiblock_user_instances.dnsmasq"
DNSMASQ_DATA_FILE="/tmp/dnsmasq*.d/02-ruantiblock.dnsmasq"
DNSMASQ_DATA_FILE_BYPASS_TMP="${DNSMASQ_DATA_FILE_BYPASS}.tmp"
DNSMASQ_DATA_FILE_USER_INSTANCES_TMP="${DNSMASQ_DATA_FILE_USER_INSTANCES}.tmp"
DNSMASQ_DATA_FILE_TMP="${DNSMASQ_DATA_FILE}.tmp"

test -e "$$FILE_MAIN_SCRIPT" && $$FILE_MAIN_SCRIPT destroy
test -e "$$FILE_INIT_SCRIPT" && $$FILE_INIT_SCRIPT disable
rm -f $$DNSMASQ_DATA_FILE $$DNSMASQ_DATA_FILE_TMP $$DNSMASQ_DATA_FILE_BYPASS $$DNSMASQ_DATA_FILE_BYPASS_TMP $$DNSMASQ_DATA_FILE_USER_INSTANCES $$DNSMASQ_DATA_FILE_USER_INSTANCES_TMP

awk -v FILE_MAIN_SCRIPT="$$FILE_MAIN_SCRIPT" '$$0 !~ FILE_MAIN_SCRIPT {
	print $$0;
}' "$$CRONTAB_FILE" > "$${CRONTAB_FILE}.tmp" && mv -f "$${CRONTAB_FILE}.tmp" "$$CRONTAB_FILE"
/etc/init.d/cron restart

exit 0

endef

$(eval $(call BuildPackage,$(PKG_NAME)))
