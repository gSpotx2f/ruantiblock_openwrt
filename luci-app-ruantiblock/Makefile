#
# (с) 2024 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ruantiblock
PKG_VERSION:=2.1.4
PKG_RELEASE:=1
LUCI_TITLE:=LuCI support for ruantiblock
LUCI_DEPENDS:=+ruantiblock
LUCI_PKGARCH:=all

#include ../../luci.mk
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
