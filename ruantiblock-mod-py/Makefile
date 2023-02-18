#
# (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock-mod-py
PKG_VERSION:=1.1
PKG_RELEASE:=0
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Python module for ruantiblock
  URL:=https://github.com/gSpotx2f/ruantiblock_openwrt
  PKGARCH:=all
  DEPENDS:=+ruantiblock +python3 +python3-setuptools +python3-openssl
endef

define Package/$(PKG_NAME)/description
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/libexec/ruantiblock
	$(INSTALL_BIN) ./files/usr/libexec/ruantiblock/ruab_parser.py $(1)/usr/libexec/ruantiblock/ruab_parser.py
	$(INSTALL_DIR) $(1)/usr/lib/python3.10
	$(INSTALL_DATA) ./files/usr/lib/python3.10/ruab_sum_ip.py $(1)/usr/lib/python3.10/ruab_sum_ip.py
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_DATA) ./files/etc/uci-defaults/ruantiblock-mod-py $(1)/etc/uci-defaults/ruantiblock-mod-py
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
