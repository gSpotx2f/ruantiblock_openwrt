#
# (с) 2023 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
#

include $(TOPDIR)/rules.mk

PKG_VERSION:=1.3-5
LUCI_TITLE:=LuCI support for ruantiblock
LUCI_DEPENDS:=+ruantiblock
LUCI_PKGARCH:=all

#include ../../luci.mk
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
