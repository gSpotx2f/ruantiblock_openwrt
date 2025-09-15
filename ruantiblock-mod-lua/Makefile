#
# (с) 2025 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=ruantiblock-mod-lua
PKG_VERSION:=2.1.8
PKG_RELEASE:=1
PKG_MAINTAINER:=gSpot <https://github.com/gSpotx2f/ruantiblock_openwrt>

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Lua module for ruantiblock
  URL:=https://github.com/gSpotx2f/ruantiblock_openwrt
  PKGARCH:=all
  DEPENDS:=+ruantiblock +lua +luasocket +luasec +luabitop +iconv +idn
  #DEPENDS:=+ruantiblock +lua +luasocket +luasec +luabitop +iconv +idn +lua-lzlib
endef

define Package/$(PKG_NAME)/description
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/libexec/ruantiblock
	$(INSTALL_BIN) ./files/usr/libexec/ruantiblock/ruab_parser.lua $(1)/usr/libexec/ruantiblock/ruab_parser.lua
	$(INSTALL_DIR) $(1)/usr/lib/lua
	$(INSTALL_DATA) ./files/usr/lib/lua/iptool.lua $(1)/usr/lib/lua/iptool.lua
	$(INSTALL_DATA) ./files/usr/lib/lua/idn.lua $(1)/usr/lib/lua/idn.lua
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
