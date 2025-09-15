#
# (с) 2025 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock-mod-py
PKG_VERSION:=2.1.8
PKG_RELEASE:=1
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
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
