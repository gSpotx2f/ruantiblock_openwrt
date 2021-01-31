#
# (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock-mod-lua
PKG_VERSION:=0.9.0
PKG_RELEASE:=1
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=Lua module for ruantiblock
	URL:=https://github.com/gSpotx2f/ruantiblock_openwrt
	PKGARCH:=all
	DEPENDS:=+ruantiblock +lua +luasocket +luasec +luabitop +iconv +idn
endef

define Package/$(PKG_NAME)/description

endef

define Build/Prepare
	$(CP) -r ./files $(PKG_BUILD_DIR)/files
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/files/usr/bin/ruab_parser.lua $(1)/usr/bin/ruab_parser.lua
	$(INSTALL_DIR) $(1)/usr/lib/lua
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/files/usr/lib/lua/ruab_sum_ip.lua $(1)/usr/lib/lua/ruab_sum_ip.lua
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
