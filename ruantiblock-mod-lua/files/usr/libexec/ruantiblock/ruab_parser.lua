#!/usr/bin/env lua

--[[
 (с) 2024 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)

 lua == 5.1
--]]

-------------------------- Class constructor -------------------------

local function Class(super, t)
    local class = t or {}
    local function instance_constructor(cls, t)
        local instance = t or {}
        setmetatable(instance, cls)
        instance.__class = cls
        return instance
    end
    if not super then
        local mt = {__call = instance_constructor}
        mt.__index = mt
        setmetatable(class, mt)
    elseif type(super) == "table" and super.__index and super.__call then
        setmetatable(class, super)
        class.__super = super
    else
        error("Argument error! Incorrect object of a 'super'")
    end
    class.__index = class
    class.__call = instance_constructor
    return class
end

------------------------------ Settings ------------------------------

local Config = Class(nil, {
    environ_table = {
        ["BLLIST_SOURCE"] = true,
        ["BLLIST_MODE"] = true,
        ["BLLIST_ALT_NSLOOKUP"] = true,
        ["BLLIST_ALT_DNS_ADDR"] = true,
        ["BLLIST_ENABLE_IDN"] = true,
        ["BLLIST_GR_EXCLUDED_SLD"] = true,
        ["BLLIST_GR_EXCLUDED_MASKS"] = true,
        ["BLLIST_FQDN_FILTER"] = true,
        ["BLLIST_FQDN_FILTER_TYPE"] = true,
        ["BLLIST_FQDN_FILTER_FILE"] = true,
        ["BLLIST_IP_FILTER"] = true,
        ["BLLIST_IP_FILTER_TYPE"] = true,
        ["BLLIST_IP_FILTER_FILE"] = true,
        ["BLLIST_SD_LIMIT"] = true,
        ["BLLIST_IP_LIMIT"] = true,
        ["BLLIST_GR_EXCLUDED_NETS"] = true,
        ["BLLIST_MIN_ENTRIES"] = true,
        ["BLLIST_STRIP_WWW"] = true,
        ["NFT_TABLE"] = true,
        ["NFT_TABLE_DNSMASQ"] = true,
        ["NFTSET_CIDR"] = true,
        ["NFTSET_IP"] = true,
        ["NFTSET_DNSMASQ"] = true,
        ["NFTSET_CIDR_CFG"] = true,
        ["NFTSET_IP_CFG"] = true,
        ["NFTSET_DNSMASQ"] = true,
        ["DNSMASQ_DATA_FILE"] = true,
        ["IP_DATA_FILE"] = true,
        ["UPDATE_STATUS_FILE"] = true,
        ["RBL_ALL_URL"] = true,
        ["RBL_IP_URL"] = true,
        ["RBL_DPI_URL"] = true,
        ["ZI_ALL_URL"] = true,
        ["AF_IP_URL"] = true,
        ["AF_FQDN_URL"] = true,
        ["RA_IP_NFTSET_URL"] = true,
        ["RA_IP_DMASK_URL"] = true,
        ["RA_IP_STAT_URL"] = true,
        ["RA_FQDN_NFTSET_URL"] = true,
        ["RA_FQDN_DMASK_URL"] = true,
        ["RA_FQDN_STAT_URL"] = true,
        ["RBL_ENCODING"] = true,
        ["ZI_ENCODING"] = true,
        ["AF_ENCODING"] = true,
        ["RA_ENCODING"] = true,
        ["BLLIST_SUMMARIZE_IP"] = true,
        ["BLLIST_SUMMARIZE_CIDR"] = true,
    },
    BLLIST_FQDN_FILTER_PATTERNS = {},
    BLLIST_IP_FILTER_PATTERNS = {},
    -- iconv type: standalone iconv or lua-iconv (standalone, lua)
    ICONV_TYPE = "standalone",
    -- standalone iconv
    ICONV_CMD = "iconv",
    WGET_CMD = "wget --no-check-certificate -q -O -",
    encoding = "UTF-8",
    site_encoding = "",
    http_send_headers = {
        ["User-Agent"] = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    },
})
Config.wget_user_agent = (Config.http_send_headers["User-Agent"]) and ' -U "' .. Config.http_send_headers["User-Agent"] .. '"' or ''

-- Loading external config

function Config:load_config(t)
    local config_arrays = {
        ["BLLIST_GR_EXCLUDED_SLD"] = true,
        ["BLLIST_GR_EXCLUDED_NETS"] = true,
    }
    for k, v in pairs(t) do
        if config_arrays[k] then
            local value_table = {}
            for v in v:gmatch('[^" ]+') do
                value_table[v] = true
            end
            self[k] = value_table
        else
            self[k] = v:match("^[0-9.]+$") and tonumber(v) or v:gsub('"', '')
        end
    end
end

function Config:load_environ_config()
    local cfg_table = {}
    for var in pairs(self.environ_table) do
        val = os.getenv(var)
        if val then
            cfg_table[var] = val
        end
    end
    self:load_config(cfg_table)
end

Config:load_environ_config()

local function remap_bool(val)
    return (val ~= 0 and val ~= false and val ~= nil) and true or false
end

Config.BLLIST_ALT_NSLOOKUP = remap_bool(Config.BLLIST_ALT_NSLOOKUP)
Config.BLLIST_ENABLE_IDN = remap_bool(Config.BLLIST_ENABLE_IDN)
Config.BLLIST_FQDN_FILTER_TYPE = remap_bool(Config.BLLIST_FQDN_FILTER_TYPE)
Config.BLLIST_IP_FILTER_TYPE = remap_bool(Config.BLLIST_IP_FILTER_TYPE)
Config.BLLIST_STRIP_WWW = remap_bool(Config.BLLIST_STRIP_WWW)
Config.BLLIST_FQDN_FILTER = remap_bool(Config.BLLIST_FQDN_FILTER)
Config.BLLIST_IP_FILTER = remap_bool(Config.BLLIST_IP_FILTER)
Config.BLLIST_SUMMARIZE_IP = remap_bool(Config.BLLIST_SUMMARIZE_IP)
Config.BLLIST_SUMMARIZE_CIDR = remap_bool(Config.BLLIST_SUMMARIZE_CIDR)

-- Loading filters

function Config:load_filter_files()
    function load_file(file, t)
        local file_handler = io.open(file, "r")
        if file_handler then
            for line in file_handler:lines() do
                if #line > 0 and line:match("^[^#]") then
                    t[line] = true
                end
            end
            file_handler:close()
        end
    end
    if self.BLLIST_FQDN_FILTER then
        load_file(self.BLLIST_FQDN_FILTER_FILE, self.BLLIST_FQDN_FILTER_PATTERNS)
    end
    if self.BLLIST_IP_FILTER then
        load_file(self.BLLIST_IP_FILTER_FILE, self.BLLIST_IP_FILTER_PATTERNS)
    end
end

Config:load_filter_files()

-- Importing packages

local function prequire(package)
    local ret_val, pkg = pcall(require, package)
    return ret_val and pkg
end

local http = prequire("socket.http")
local https = prequire("ssl.https")
local ltn12 = prequire("ltn12")
if not ltn12 then
    error("You need to install luasocket or ltn12...")
end

local idn = prequire("idn")
if Config.BLLIST_ENABLE_IDN and not idn then
    error("You need to install idn.lua (github.com/haste/lua-idn) or 'BLLIST_ENABLE_IDN' must be set to '0'")
end
local iconv = prequire("iconv")

local it
if prequire("bit") then
    it = prequire("iptool")
end
if not it then
    Config.BLLIST_SUMMARIZE_CIDR = false
    Config.BLLIST_SUMMARIZE_IP = false
end

-- Iconv check

if Config.ICONV_TYPE == "standalone" then
    local handler = io.popen("which " .. Config.ICONV_CMD)
    local ret_val = handler:read("*l")
    handler:close()
    if not ret_val then
        Config.ICONV_CMD = nil
    end
elseif Config.ICONV_TYPE == "lua" then
else
    error("Config.ICONV_TYPE should be either 'lua' or 'standalone'")
end

------------------------------ Classes -------------------------------

local BlackListParser = Class(Config, {
    ip_pattern = "%d%d?%d?%.%d%d?%d?%.%d%d?%d?%.%d%d?%d?",
    cidr_pattern = "%d%d?%d?%.%d%d?%d?%.%d%d?%d?%.%d%d?%d?/%d%d?",
    fqdn_pattern = "[a-z0-9_%.%-]-[a-z0-9_%-]+%.[a-z0-9%.%-]+",
    url = "http://127.0.0.1",
    records_separator = "\n",
})

function BlackListParser:new(t)
    -- extended instance constructor
    local instance = self(t)
    instance.url = instance["url"] or self.url
    instance.records_separator = instance["records_separator"] or self.records_separator
    instance.site_encoding = instance["site_encoding"] or self.site_encoding
    instance.cidr_count = 0
    instance.cidr_table = {}
    instance.ip_subnet_table = {}
    instance.ip_records_count = 0
    instance.ip_count = 0
    instance.ip_table = {}
    instance.sld_table = {}
    instance.fqdn_count = 0
    instance.fqdn_records_count = 0
    instance.fqdn_table = {}
    instance.iconv_handler = iconv and iconv.open(instance.encoding, instance.site_encoding) or nil
    return instance
end

function BlackListParser:convert_encoding(input)
    local output
    if self.ICONV_TYPE == "lua" and self.iconv_handler then
        output = self.iconv_handler:iconv(input)
    elseif self.ICONV_TYPE == "standalone" and self.ICONV_CMD then
        local iconv_handler = assert(io.popen('printf \'' .. input .. '\' | ' .. self.ICONV_CMD .. ' -f "' .. self.site_encoding .. '" -t "' .. self.encoding .. '"', 'r'))
        output = iconv_handler:read("*a")
        iconv_handler:close()
    end
    return (output)
end

function BlackListParser:convert_to_punycode(input)
    if self.site_encoding and self.site_encoding ~= "" then
        input = self:convert_encoding(input)
    end
    return input and (idn.encode(input))
end

function BlackListParser:check_filter(str, filter_patterns, reverse)
    if filter_patterns and str then
        for pattern in pairs(filter_patterns) do
            if str:match(pattern) then
                return not reverse
            end
        end
    end
    return reverse
end

function BlackListParser:get_subnet(ip)
    return ip:match("^(%d+%.%d+%.%d+%.)%d+$")
end

function BlackListParser:ip_value_processing(value)
    if value and value ~= "" then
        for ip_entry in value:gmatch(self.ip_pattern .. "/?%d?%d?") do
            if not self.BLLIST_IP_FILTER or (self.BLLIST_IP_FILTER and not self:check_filter(ip_entry, self.BLLIST_IP_FILTER_PATTERNS, self.BLLIST_IP_FILTER_TYPE)) then
                if ip_entry:match("^" .. self.ip_pattern .. "$") and not self.ip_table[ip_entry] then
                    local subnet = self:get_subnet(ip_entry)
                    if subnet and (self.BLLIST_GR_EXCLUDED_NETS[subnet] or ((not self.BLLIST_IP_LIMIT or self.BLLIST_IP_LIMIT == 0) or (not self.ip_subnet_table[subnet] or self.ip_subnet_table[subnet] <= self.BLLIST_IP_LIMIT))) then
                        self.ip_table[ip_entry] = subnet
                        self.ip_subnet_table[subnet] = (self.ip_subnet_table[subnet] or 0) + 1
                        self.ip_count = self.ip_count + 1
                    end
                elseif ip_entry:match("^" .. self.cidr_pattern .. "$") and not self.cidr_table[ip_entry] then
                    self.cidr_table[ip_entry] = true
                    self.cidr_count = self.cidr_count + 1
                end
            end
        end
    end
end

function BlackListParser:get_sld(fqdn)
    return fqdn:match("^[a-z0-9_%.%-]-([a-z0-9_%-]+%.[a-z0-9%-]+)$")
end

function BlackListParser:fqdn_value_processing(value)
    value = value:gsub("%*%.", ""):gsub("%.$", ""):lower()
    if self.BLLIST_STRIP_WWW then
        value = value:gsub("^www[0-9]?%.", "")
    end
    if not self.BLLIST_FQDN_FILTER or (self.BLLIST_FQDN_FILTER and not self:check_filter(value, self.BLLIST_FQDN_FILTER_PATTERNS, self.BLLIST_FQDN_FILTER_TYPE)) then
        if value:match("^" .. self.fqdn_pattern .. "$") then
        elseif self.BLLIST_ENABLE_IDN and value:match("^[^\\/&%?]-[^\\/&%?%.]+%.[^\\/&%?%.]+%.?$") then
            value = self:convert_to_punycode(value)
            if not value then
                return false
            end
        else
            return false
        end
        local sld = self:get_sld(value)
        if sld and (self.BLLIST_GR_EXCLUDED_SLD[sld] or ((not self.BLLIST_SD_LIMIT or self.BLLIST_SD_LIMIT == 0) or (not self.sld_table[sld] or self.sld_table[sld] < self.BLLIST_SD_LIMIT))) then
            self.fqdn_table[value] = sld
            self.sld_table[sld] = (self.sld_table[sld] or 0) + 1
            self.fqdn_count = self.fqdn_count + 1
        end
    end
    return true
end

function BlackListParser:parser_func()
    -- Must be overridden by a subclass
    error("Method BlackListParser:parser_func() must be overridden by a subclass!")
end

function BlackListParser:chunk_buffer()
    local buff = ""
    local ret_value = ""
    local last_chunk
    return function(chunk)
        if last_chunk then
            return nil
        end
        if chunk then
            buff = buff .. chunk
            local last_rs_position = select(2, buff:find("^.*" .. self.records_separator))
            if last_rs_position then
                ret_value = buff:sub(1, last_rs_position)
                buff = buff:sub((last_rs_position + 1), -1)
            else
                ret_value = ""
            end
        else
            ret_value = buff
            last_chunk = true
        end
        return (ret_value)
    end
end

function BlackListParser:get_http_data(url)
    local ret_val, ret_code, ret_headers
    local http_module = url:match("^https") and https or http
    if http_module then
        local http_sink = ltn12.sink.chain(self:chunk_buffer(), self:parser_func())
        ret_val, ret_code, ret_headers = http_module.request{url = url, sink = http_sink, headers = self.http_send_headers}
        if not ret_val or ret_code ~= 200 then
            ret_val = nil
            print(string.format("Connection error! (%s) URL: %s", ret_code, url))
        end
    else
        local wget_sink = ltn12.sink.chain(self:chunk_buffer(), self:parser_func())
        ret_val = ltn12.pump.all(ltn12.source.file(io.popen(self.WGET_CMD .. self.wget_user_agent .. ' "' .. url .. '"', 'r')), wget_sink)
    end
    return (ret_val == 1) and true or false
end

function BlackListParser:run()
    local return_code = 0
    if self:get_http_data(self.url) then
        if (self.fqdn_count + self.ip_count + self.cidr_count) > self.BLLIST_MIN_ENTRIES then
            return_code = 0
        else
            return_code = 2
        end
    else
        return_code = 1
    end
    return return_code
end


local Summarize = {
    HOSTS_LIMIT = 0,
    NETS_LIMIT = 0,
}

function Summarize:_sort_ip_list(t)
    local t2 = {}
    for k in pairs(t) do
        t2[#t2 + 1] = k
    end
    table.sort(t2, function(a, b) return it.ip_to_int(a) < it.ip_to_int(b) end)
    return t2
end

function Summarize:_group_ip_ranges(ip_list, raw_list)
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
                    if hosts > 1 and hosts >= self.HOSTS_LIMIT then
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
                if hosts > 1 and hosts >= self.HOSTS_LIMIT then
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

function Summarize:_sort_net_list(t)
    local t2 = {}
    for k, v in pairs(t) do
        local ip, pref = it.get_network_addr(k)
        t2[#t2 + 1] = {[1] = ip, [2] = pref}
    end
    table.sort(t2, function(a, b) return a[1] < b[1] end)
    return t2
end

function Summarize:_group_nets(cidr_list, raw_list)
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
                        if nets > 1 and nets >= self.NETS_LIMIT then
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
                if nets > 1 and nets >= self.NETS_LIMIT then
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

function Summarize:_summarize_ranges(ip_iter)
    local s_range_iter
    return function()
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
                repeat
                    local ip_t = s_range_iter()
                    if ip_t then
                        return ip_t
                    end
                until not ip_t
            end
        else
            return
        end
    end
end

function Summarize:summarize_ip_ranges(ip_list, modify_raw_list)
    local summ_iter = self:_summarize_ranges(
        self:_group_ip_ranges(self:_sort_ip_list(ip_list), modify_raw_list and ip_list)
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

function Summarize:summarize_nets(cidr_list, modify_raw_list)
    return self:_summarize_ranges(
        self:_group_nets(self:_sort_net_list(cidr_list), modify_raw_list and cidr_list)
    )
end


local OptimizeConfig = Class(Config, {
    parsers_list = {},
})

function OptimizeConfig:new(t)
    -- extended instance constructor
    local instance = self(t)
    instance.parsers_list = instance.parsers_list or self.parsers_list
    instance.cidr_count = 0
    instance.cidr_table = {}
    instance.ip_subnet_table = {}
    instance.ip_records_count = 0
    instance.ip_table = {}
    instance.sld_table = {}
    instance.fqdn_records_count = 0
    instance.fqdn_table = {}
    return instance
end

function OptimizeConfig:_optimize_ip_table()
    local optimized_table = {}
    for ipaddr, subnet in pairs(self.ip_table) do
        if self.ip_subnet_table[subnet] then
            if (self.BLLIST_IP_LIMIT and self.BLLIST_IP_LIMIT > 0 and not self.BLLIST_GR_EXCLUDED_NETS[subnet]) and self.ip_subnet_table[subnet] >= self.BLLIST_IP_LIMIT then
                self.cidr_table[string.format("%s0/24", subnet)] = true
                self.ip_subnet_table[subnet] = nil
                self.cidr_count = self.cidr_count + 1
            else
                optimized_table[ipaddr] = true
                self.ip_records_count = self.ip_records_count + 1
            end
        end
    end
    self.ip_table = optimized_table
end

function OptimizeConfig:_optimize_fqdn_table()
    local optimized_table = {}
    if self.BLLIST_GR_EXCLUDED_MASKS and #self.BLLIST_GR_EXCLUDED_MASKS > 0 then
        for sld in pairs(self.sld_table) do
            for _, pattern in ipairs(self.BLLIST_GR_EXCLUDED_MASKS) do
                if sld:find(pattern) then
                    self.sld_table[sld] = 0
                    break
                end
            end
        end
    end
    for fqdn, sld in pairs(self.fqdn_table) do
        local key_value = fqdn
        if (not self.fqdn_table[sld] or fqdn == sld) and self.sld_table[sld] then
            if (self.BLLIST_SD_LIMIT and self.BLLIST_SD_LIMIT > 0 and not self.BLLIST_GR_EXCLUDED_SLD[sld]) and self.sld_table[sld] >= self.BLLIST_SD_LIMIT then
                key_value = sld
                self.sld_table[sld] = nil
            end
            optimized_table[key_value] = true
            self.fqdn_records_count = self.fqdn_records_count + 1
        end
    end
    self.fqdn_table = optimized_table
end

function OptimizeConfig:_group_ip_ranges()
    for i in Summarize:summarize_ip_ranges(self.ip_table, true) do
        self.cidr_table[string.format("%s/%s", it.int_to_ip(i[1]), i[2])] = true
    end
end

function OptimizeConfig:_group_cidr_ranges()
    for i in Summarize:summarize_nets(self.cidr_table, true) do
        self.cidr_table[string.format("%s/%s", it.int_to_ip(i[1]), i[2])] = true
    end
end

function OptimizeConfig:_union(t1, t2)
    local new_items = 0
    for k, v in pairs(t2) do
        if t1[k] == nil then
            t1[k] = v
            new_items = new_items + 1
        end
    end
    return new_items
end

function OptimizeConfig:optimize()
    for _, i in ipairs(self.parsers_list) do
        self:_union(self.cidr_table, i.cidr_table)
        self:_union(self.ip_table, i.ip_table)
        self:_union(self.ip_subnet_table, i.ip_subnet_table)
        self:_union(self.fqdn_table, i.fqdn_table)
        self:_union(self.sld_table, i.sld_table)
    end
    self:_optimize_fqdn_table()
    self:_optimize_ip_table()
    if self.BLLIST_SUMMARIZE_IP then
        self:_group_ip_ranges()
    end
    if self.BLLIST_SUMMARIZE_CIDR then
        self:_group_cidr_ranges()
    end
end


local WriteConfigFiles = Class(Config, {})

function WriteConfigFiles:new(t)
    -- extended instance constructor
    local instance = self(t)
    instance.cidr_count = 0
    instance.ip_count = 0
    instance.fqdn_count = 0
    return instance
end

function WriteConfigFiles:write_ipset_config(ip_table, cidr_table)
    local file_handler = assert(io.open(self.IP_DATA_FILE, "w"), "Could not open nftset config")
    for _, v in ipairs({ self.NFTSET_CIDR, self.NFTSET_IP }) do
        file_handler:write(string.format("flush set %s %s\n", self.NFT_TABLE, v))
    end
    file_handler:write(
        string.format("table %s {\n%s", self.NFT_TABLE, self.NFTSET_CIDR_CFG)
    )
    local c = 0
    if next(cidr_table) then
        file_handler:write("elements={")
        for cidr in pairs(cidr_table) do
            file_handler:write(string.format("%s,", cidr))
            c = c + 1
        end
        file_handler:write("};")
    end
    self.cidr_count = c
    file_handler:write(
        string.format("}\n%s", self.NFTSET_IP_CFG)
    )
    local i = 0
    if next(ip_table) then
        file_handler:write("elements={")
        for ipaddr in pairs(ip_table) do
            file_handler:write(string.format("%s,", ipaddr))
            i = i + 1
        end
        file_handler:write("};")
    end
    self.ip_count = i
    file_handler:write("}\n}\n")
    file_handler:close()
end

function WriteConfigFiles:write_dnsmasq_config(fqdn_table)
    local file_handler = assert(io.open(self.DNSMASQ_DATA_FILE, "w"), "Could not open dnsmasq config")
    local i = 0
    for fqdn in pairs(fqdn_table) do
        if self.BLLIST_ALT_NSLOOKUP then
            file_handler:write(string.format("server=/%s/%s\n", fqdn, self.BLLIST_ALT_DNS_ADDR))
        end
        file_handler:write(string.format("nftset=/%s/%s#%s\n", fqdn, self.NFT_TABLE_DNSMASQ, self.NFTSET_DNSMASQ))
        i = i + 1
    end
    self.fqdn_count = i
    file_handler:close()
end

function WriteConfigFiles:write_update_status_file()
    local file_handler = assert(io.open(self.UPDATE_STATUS_FILE, "w"), "Could not open 'update_status' file")
    file_handler:write(string.format("%d %d %d", self.cidr_count, self.ip_count, self.fqdn_count))
    file_handler:close()
end

-- Parser subclasses

local function ip_parser_func(self)
    return function(chunk)
        if chunk and chunk ~= "" then
            for ip_string in chunk:gmatch(self.ip_string_pattern) do
                self:ip_value_processing(ip_string)
            end
        end
        return true
    end
end

local function fqdn_parser_func(self, ip_str, fqdn_str)
    if #fqdn_str > 0 and not fqdn_str:match("^" .. self.ip_pattern .. "$") then
        if self:fqdn_value_processing(fqdn_str) then
            return true
        end
    end
    self:ip_value_processing(ip_str)
end

    -- rublacklist.net

local Rbl = Class(BlackListParser, {
    url = Config.RBL_ALL_URL,
    records_separator = '%{"appearDate": ',
})

function Rbl:parser_func()
    return function(chunk)
        if chunk and chunk ~= "" then
            for fqdn_str, ip_str in chunk:gmatch('"domains": %["?(.-)"?%].-"ips": %[([a-f0-9/.:", ]*)%].-') do
                fqdn_parser_func(self, ip_str, fqdn_str)
            end
        end
        return true
    end
end

local RblIp = Class(Rbl, {
    url = Config.RBL_IP_URL,
    records_separator = ",",
    ip_string_pattern = "([a-f0-9/.:]+)",
    parser_func = ip_parser_func,
})

local RblDPI = Class(BlackListParser, {
    url = Config.RBL_DPI_URL,
    BLLIST_MIN_ENTRIES = 0,
    records_separator = '%{"domains"',
})

function RblDPI:parser_func()
    return function(chunk)
        if chunk and chunk ~= "" then
            for fqdn_list in chunk:gmatch(': %[(.-)%]') do
                for fqdn_str in fqdn_list:gmatch(self.fqdn_pattern) do
                    self:fqdn_value_processing(fqdn_str)
                end
            end
        end
        return true
    end
end

    -- zapret-info

local Zi = Class(BlackListParser, {
    url = Config.ZI_ALL_URL,
    site_encoding = Config.ZI_ENCODING,
})

function Zi:parser_func()
    return function(chunk)
        if chunk and chunk ~= "" then
            for ip_str, fqdn_str in chunk:gmatch("([^;]-);([^;]-);.-" .. self.records_separator) do
                fqdn_parser_func(self, ip_str, fqdn_str)
            end
        end
        return true
    end
end

local ZiIp = Class(Zi, {
    ip_string_pattern = "([a-f0-9%.:/ |]+);.-\n",
    parser_func = ip_parser_func,
})

    -- antifilter

local Af = Class(BlackListParser, {
    url = Config.AF_FQDN_URL,
})

function Af:parser_func()
    local entry_pattern = "((.-))" .. self.records_separator
    return function(chunk)
        if chunk and chunk ~= "" then
            for fqdn_str, ip_str in chunk:gmatch(entry_pattern) do
                fqdn_parser_func(self, ip_str, fqdn_str)
            end
        end
        return true
    end
end

local AfIp = Class(Af, {
    url = Config.AF_IP_URL,
    ip_string_pattern = "(.-)\n",
    parser_func = ip_parser_func,
})

    -- ruantiblock

local Ra = Class(BlackListParser, {
    url_ipset = Config.RA_FQDN_IPSET_URL,
    url_dnsmasq = Config.RA_FQDN_DMASK_URL,
    url_stat = Config.RA_FQDN_STAT_URL,
})

function Ra:download_config(url, file)
    local ret_val = false
    self.current_file_handler = assert(io.open(file, "w"), "Could not open file")
    if self:get_http_data(url) then
        ret_val = true
    end
    self.current_file_handler:close()
    return ret_val
end

function Ra:chunk_buffer()
    return function(chunk)
        return chunk
    end
end

function Ra:parser_func()
    return function(chunk)
        if chunk and chunk ~= "" then
            self.current_file_handler:write(chunk)
        end
        return true
    end
end

function Ra:run()
    local return_code = 1
    if self:download_config(self.url_ipset, self.IP_DATA_FILE) then
        if self:download_config(self.url_dnsmasq, self.DNSMASQ_DATA_FILE) then
            if self:download_config(self.url_stat, self.UPDATE_STATUS_FILE) then
                return_code = 0
            end
        end
    end
    return return_code
end

local RaIp = Class(Ra, {
    url_ipset = Config.RA_IP_IPSET_URL,
    url_dnsmasq = Config.RA_IP_DMASK_URL,
    url_stat = Config.RA_IP_STAT_URL,
})

----------------------------- Main section ------------------------------

local parsers_table = {
    ["ip"] = {["rublacklist"] = {RblIp}, ["zapret-info"] = {ZiIp}, ["antifilter"] = {AfIp}, ["ruantiblock"] = {RaIp}},
    ["fqdn"] = {["rublacklist"] = {Rbl, RblDPI}, ["zapret-info"] = {Zi}, ["antifilter"] = {Af}, ["ruantiblock"] = {Ra}},
}

local ret_list = {}
local parser_classes = parsers_table[Config.BLLIST_MODE] and parsers_table[Config.BLLIST_MODE][Config.BLLIST_SOURCE]
if parser_classes then
    local parser_instances = {}
    for _, i in ipairs(parser_classes) do
        parser_instances[#parser_instances + 1] = i:new()
    end
    for _, i in ipairs(parser_instances) do
        ret_list[i:run()] = true
    end
    return_sum = 0
    for i, _ in pairs(ret_list) do
        return_sum = return_sum + i
    end
    if return_sum == 0 and Config.BLLIST_SOURCE ~= "ruantiblock" then
        local oc_obj = OptimizeConfig:new({parsers_list = parser_instances})
        oc_obj:optimize()
        local write_cfg_obj = WriteConfigFiles:new()
        write_cfg_obj:write_dnsmasq_config(oc_obj.fqdn_table)
        write_cfg_obj:write_ipset_config(oc_obj.ip_table, oc_obj.cidr_table)
        write_cfg_obj:write_update_status_file()
    end
else
    error("Wrong configuration! (Config.BLLIST_MODE, Config.BLLIST_SOURCE)")
end
os.exit(ret_list[1] and 1 or (ret_list[2] and 2 or 0))
