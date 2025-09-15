--[[
 (с) 2020 gSpot <https://github.com/gSpotx2f/iptool-lua>

 Some functions for manipulating IPv4 addresses.

 validate_ip(ip)
 ip_to_int(ip)
 int_to_ip(ip)
 summarize_address_range(first, last)
 get_network_addr(network)
 hosts_from_network(ip)
 get_supernet(network, new_prefix)

 lua == 5.1
 depends: lua-bitop
--]]

local bit = require("bit")
local bnot, band, bor = bit.bnot, bit.band, bit.bor
local bxor, lshift, rshift = bit.bxor, bit.lshift, bit.rshift

local ipv4_length = 32
local ipv4_capacity = 2 ^ ipv4_length - 1
local ipaddr_pattern = "^(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)$"
local cidr_pattern = "^(%d%d?%d?%.%d%d?%d?%.%d%d?%d?%.%d%d?%d?)/(%d%d?)$"

local function bit_length(n)
    if n == 0 then
        return 0
    elseif n < 0 then
        n = -n
    end
    local i = 1
    repeat
        local s = rshift(n, i)
        i = i + 1
    until s <= 0
    return i - 1
end

local function check_ip(...)
    if not ... then
        return false
    end
    for _, i in ipairs{...} do
        if type(i) ~= "number" or (0 > i or i > 255) then
            return false
        end
    end
    return true
end

local function check_prefix(n)
    if type(n) ~= "number" or (0 > n or n > 32) then
        return false
    end
    return true
end

local function validate_ip(ip)
    local a, b, c, d, e = ip:match("^(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)%.(%d%d?%d?)/?(%d?%d?)$")
    if check_ip(tonumber(a), tonumber(b), tonumber(c), tonumber(d)) and
        (#e == 0 or check_prefix(tonumber(e))) then
        return true
    end
    return false
end

local function ip_to_int(ip)
    if type(ip) == "number" then
        return ip
    else
        local a, b, c, d = ip:match(ipaddr_pattern)
        return a and tonumber(a) * 16777216 + tonumber(b) * 65536 + tonumber(c) * 256 + tonumber(d) or nil
    end
end

local function int_to_ip(number)
    local octets = {}
    for i = 1, 4 do
        table.insert(octets, 1, tostring(band(number, 255)))
        number = rshift(number, 8)
    end
    return table.concat(octets, ".")
end

local function count_righthand_zero_bits(number, bits)
    return (number == 0) and bits or math.min(bits, bit_length(band(bnot(number), (number - 1))))
end

local function summarize_address_range(first, last)
    local ip_bits = ipv4_length
    first, last = ip_to_int(first), ip_to_int(last)
    local ret_val
    return function()
        if first > last then
            return
        end
        local nbits = math.min(count_righthand_zero_bits(first, ip_bits), bit_length(last - first + 1) - 1)
        ret_val = {[1] = first, [2] = (ip_bits - nbits)}

        first = first + lshift(1, nbits)
        if first - 1 == ipv4_capacity then
            return
        end
        return ret_val
    end
end

local function get_network_addr(network)
    local ip, pref = network:match(cidr_pattern)
    return ip and ip_to_int(ip), tonumber(pref)
end

local function hosts_from_network(network)
    local network_address, prefixlen
    if type(network) == "string" then
        network_address, prefixlen = get_network_addr(network)
    elseif type(network) == "table" then
        network_address, prefixlen = network[1], network[2]
    else
        return
    end
    local last_ip = network_address + (lshift(1, 32 - prefixlen) - 2)
    local ret_val
    local current_ip = network_address
    return function()
        current_ip = current_ip + 1
        if (prefixlen == 31 and current_ip - 2 or current_ip) <= last_ip then
            ret_val = current_ip
        else
            ret_val = nil
        end
        return ret_val
    end
end

local function get_supernet(network, new_prefix)
    local network_address, prefixlen
    if type(network) == "string" then
        network_address, prefixlen = get_network_addr(network)
    elseif type(network) == "table" then
        network_address, prefixlen = network[1], network[2]
    else
        return
    end
    if new_prefix > prefixlen then
        error("new_prefix must be shorter")
    end
    local netmask = bxor(ipv4_capacity, rshift(ipv4_capacity, prefixlen))
    if netmask < 0 then
        netmask = netmask + ipv4_capacity + 1
    end
    local diff_prefixlen = prefixlen - new_prefix
    return band(network_address, lshift(netmask, diff_prefixlen))
end

local function overlap_ip(ip, network)
    local network_address, prefixlen
    if type(network) == "string" then
        network_address, prefixlen = get_network_addr(network)
    elseif type(network) == "table" then
        network_address, prefixlen = network[1], network[2]
    else
        return
    end
    ip = ip_to_int(ip)
    if ip == nil then
        return
    end
    local offset = ipv4_length - prefixlen
    return (rshift(ip, offset) == rshift(network_address, offset))

end

local function check_network(net)
    local network_address, prefixlen
    if type(net) == "string" then
        network_address, prefixlen = get_network_addr(net)
    elseif type(net) == "table" then
        network_address, prefixlen = net[1], net[2]
    else
        return
    end
    return network_address, prefixlen
end

local function overlap_net(subnet, network)
    local network_address_1, prefixlen_1 = check_network(subnet)
    local network_address_2, prefixlen_2 = check_network(network)
    if (network_address_1 == nil or prefixlen_1 == nil or
        network_address_2 == nil or prefixlen_2 == nil) then
        return
    end
    if network_address_1 == network_address_2 then
        return true
    end
    local offset = ipv4_length - math.min(prefixlen_1, prefixlen_2)
    return (rshift(network_address_1, offset) == rshift(network_address_2, offset))
end

return {
    validate_ip = validate_ip,
    ip_to_int = ip_to_int,
    int_to_ip = int_to_ip,
    summarize_address_range = summarize_address_range,
    get_network_addr = get_network_addr,
    hosts_from_network = hosts_from_network,
    get_supernet = get_supernet,
    overlap_ip = overlap_ip,
    overlap_net = overlap_net,
}
