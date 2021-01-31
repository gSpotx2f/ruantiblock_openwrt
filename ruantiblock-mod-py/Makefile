#
# (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock-mod-py
PKG_VERSION:=0.9.0
PKG_RELEASE:=1
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

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

define Build/Prepare
	$(CP) -r ./files $(PKG_BUILD_DIR)/files
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/usr/bin/ruab_parser.py $(1)/usr/bin/ruab_parser.py
	$(INSTALL_DIR) $(1)/usr/lib/python3.7
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/files/usr/lib/python3.7/ruab_sum_ip.py $(1)/usr/lib/python3.7/ruab_sum_ip.py
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
