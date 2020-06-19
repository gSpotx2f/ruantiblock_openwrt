--[[
 (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)
--]]

local it = require("iptool")

HOSTS_LIMIT = 0
NETS_LIMIT = 0

local function sort_ip_list(t)
    local t2 = {}
    for k in pairs(t) do
        t2[#t2 + 1] = k
    end
    table.sort(t2, function(a, b) return it.ip_to_int(a) < it.ip_to_int(b) end)
    return t2
end

local function group_ip_ranges(ip_list, raw_list)
    local function remove_items(start, stop)
        for i = start, stop do
            if raw_list[i] then
                raw_list[i] = nil
                return
            end
            local item = it.int_to_ip(i)
            if raw_list[item] then
                raw_list[it.int_to_ip(i)] = nil
            end
        end
    end

    local start, stop, last_call
    local hosts = 1
    local i = 0
    return function()
        local ret_val
        local ip
        repeat
            i = i + 1
            ip = ip_list[i]
            if ip then
                local ip_dec = it.ip_to_int(ip)
                if stop and (stop + 1) == ip_dec then
                    hosts = hosts + 1
                else
                    if hosts > 1 and hosts >= HOSTS_LIMIT then
                        if raw_list then
                            remove_items(start, stop)
                        end
                        ret_val = {[1] = start, [2] = stop}
                        start = ip_dec
                        stop = ip_dec
                        hosts = 1
                        break
                    end
                    start = ip_dec
                end
                stop = ip_dec
            elseif not last_call then
                if hosts > 1 and hosts >= HOSTS_LIMIT then
                    if raw_list then
                        remove_items(start, stop)
                    end
                    ret_val = {[1] = start, [2] = stop}
                    last_call = true
                    break
                end
            end
        until not ip
        return ret_val
    end
end

local function sort_net_list(t)
    local t2 = {}
    for k, v in pairs(t) do
        local ip, pref = it.get_network_addr(k)
        t2[#t2 + 1] = {[1] = ip, [2] = pref}
    end
    table.sort(t2, function(a, b) return a[1] < b[1] end)
    return t2
end

local function group_nets(cidr_list, raw_list)
    local function remove_items(start, stop)
        for i = start, stop, 256 do
            local item = it.int_to_ip(i) .. "/24"
            if raw_list[item] then
                raw_list[item] = nil
            end
        end
    end

    local start, stop, last_call, curr_supernet
    local nets = 1
    local i = 0
    return function()
        local ret_val
        local cidr
        repeat
            i = i + 1
            cidr = cidr_list[i]
            if cidr then
                local network_address, prefixlen
                if type(cidr) == "string" then
                    network_address, prefixlen = it.get_network_addr(cidr)
                elseif type(cidr) == "table" then
                    network_address, prefixlen = cidr[1], cidr[2]
                end
                if prefixlen == 24 then
                    local supernet = it.get_supernet({[1] = network_address, [2] = prefixlen}, 16)
                    if stop and supernet == curr_supernet and (stop + 256) == network_address then
                        nets = nets + 1
                    else
                        if nets > 1 and nets >= NETS_LIMIT then
                            if raw_list then
                                remove_items(start, stop)
                            end
                            ret_val = {[1] = start, [2] = stop + 255}
                            start = network_address
                            stop = network_address
                            nets = 1
                            curr_supernet = supernet
                            break
                        end
                        start = network_address
                        curr_supernet = supernet
                    end
                    stop = network_address
                end
            elseif not last_call then
                if nets > 1 and nets >= NETS_LIMIT then
                    if raw_list then
                        remove_items(start, stop)
                    end
                    ret_val = {[1] = start, [2] = stop + 255}
                    last_call = true
                    break
                end
            end
        until not cidr
        return ret_val
    end
end

local function summarize_ranges(ip_iter)
    local s_range_iter
    return function()
        -- lua >= 5.2
        --::check_prefix::
        if s_range_iter then
            repeat
                local ip_t = s_range_iter()
                if ip_t then
                    return ip_t
                end
            until not ip_t
        end
        local ip_range = ip_iter()
        if ip_range then
            s_range_iter = it.summarize_address_range(ip_range[1], ip_range[2])
            if s_range_iter then
                -- lua >= 5.2
                --goto check_prefix
                -- lua < 5.2
                repeat
                    local ip_t = s_range_iter()
                    if ip_t then
                        return ip_t
                    end
                until not ip_t
                --
            end
        else
            return
        end
    end
end

function summarize_ip_ranges(ip_list, modify_raw_list)
    local summ_iter = summarize_ranges(group_ip_ranges(sort_ip_list(ip_list),
                                                       modify_raw_list and ip_list)
                                        )
    return function()
        repeat
            local ip_t = summ_iter()
            if ip_t and ip_t[2] == 32 then
                if modify_raw_list then
                    ip_list[it.int_to_ip(ip_t[1])] = true
                end
            else
                return ip_t
            end
        until not ip_t
    end
end

function summarize_nets(cidr_list, modify_raw_list)
    return summarize_ranges(group_nets(sort_net_list(cidr_list),
                                       modify_raw_list and cidr_list))
end

return {
    summarize_ip_ranges = summarize_ip_ranges,
    summarize_nets = summarize_nets,
}
