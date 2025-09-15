#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
(с) 2025 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)

 Python >= 3.6
"""

from contextlib import contextmanager
from ipaddress import (IPv4Address, IPv4Network, summarize_address_range,
                       AddressValueError, NetmaskValueError)
import os
import re
import socket
import ssl
import sys
from urllib import request
#import zlib


class Config:
    environ_list = [
        "BLLIST_SOURCE",
        "BLLIST_MODE",
        "BLLIST_ALT_NSLOOKUP",
        "BLLIST_ALT_DNS_ADDR",
        "BLLIST_ENABLE_IDN",
        "BLLIST_GR_EXCLUDED_SLD_FILE",
        "BLLIST_GR_EXCLUDED_SLD_MASKS_FILE",
        "BLLIST_FQDN_FILTER",
        "BLLIST_FQDN_FILTER_TYPE",
        "BLLIST_FQDN_FILTER_FILE",
        "BLLIST_IP_FILTER",
        "BLLIST_IP_FILTER_TYPE",
        "BLLIST_IP_FILTER_FILE",
        "BLLIST_SD_LIMIT",
        "BLLIST_IP_LIMIT",
        "BLLIST_GR_EXCLUDED_NETS_FILE",
        "BLLIST_MIN_ENTRIES",
        "BLLIST_STRIP_WWW",
        "NFT_TABLE",
        "NFT_TABLE_DNSMASQ",
        "NFTSET_CIDR",
        "NFTSET_IP",
        "NFTSET_DNSMASQ",
        "NFTSET_CIDR_STRING_MAIN",
        "NFTSET_IP_STRING_MAIN",
        "DNSMASQ_DATA_FILE",
        "IP_DATA_FILE",
        "UPDATE_STATUS_FILE",
        "RBL_ALL_URL",
        "RBL_IP_URL",
        "RBL_DPI_URL",
        "ZI_ALL_URL",
        "AF_IP_URL",
        "AF_FQDN_URL",
        "FZ_URL",
        "DL_IPSET_URL",
        "DL_DMASK_URL",
        "DL_STAT_URL",
        "RBL_ENCODING",
        "ZI_ENCODING",
        "AF_ENCODING",
        "FZ_ENCODING",
        "BLLIST_SUMMARIZE_IP",
        "BLLIST_SUMMARIZE_CIDR",
        "BLLIST_FQDN_EXCLUDED_ENABLE",
        "BLLIST_FQDN_EXCLUDED_FILE",
        "BLLIST_IP_EXCLUDED_ENABLE",
        "BLLIST_IP_EXCLUDED_FILE",
        "BLLIST_CIDR_EXCLUDED_ENABLE",
        "BLLIST_CIDR_EXCLUDED_FILE",
    ]
    BLLIST_FQDN_FILTER_PATTERNS = []
    BLLIST_IP_FILTER_PATTERNS = []
    BLLIST_GR_EXCLUDED_SLD_PATTERNS = set()
    BLLIST_GR_EXCLUDED_SLD_MASKS_PATTERNS = []
    BLLIST_GR_EXCLUDED_NETS_PATTERNS = set()
    BLLIST_FQDN_EXCLUDED_ITEMS = set()
    BLLIST_IP_EXCLUDED_ITEMS = set()
    BLLIST_CIDR_EXCLUDED_ITEMS = []

    @classmethod
    def _load_config(cls, cfg_dict):

        def normalize_string(string):
            return re.sub('"', '', string)

        config_sets = set()
        config_arrays = {
            "RBL_ALL_URL",
            "RBL_IP_URL",
            "RBL_DPI_URL",
            "ZI_ALL_URL",
            "AF_IP_URL",
            "AF_FQDN_URL",
            "FZ_URL",
            "DL_IPSET_URL",
            "DL_DMASK_URL",
            "DL_STAT_URL",
        }
        try:
            for k, v in cfg_dict.items():
                if k in config_sets:
                    value = {normalize_string(i) for i in v.split(" ")}
                elif k in config_arrays:
                    value = [normalize_string(i) for i in v.split(" ")]
                else:
                    try:
                        value = int(v)
                    except ValueError:
                        value = normalize_string(v)
                setattr(cls, k, value)
        except Exception:
            pass

    @classmethod
    def load_environ_config(cls):
        cls._load_config({
            k: v for k, v in os.environ.items()
            if k in cls.environ_list
        })

    @classmethod
    def _load_filter(cls, file_path, filter_patterns, is_array=False, func=None):
        try:
            with open(file_path, "rt") as file_handler:
                for line in file_handler:
                    if line and not re.match(r"(^#|^$)", line):
                        value = line.strip()
                        if func:
                            value = func(value)
                            if value is None:
                                continue
                        if is_array:
                            filter_patterns.append(value)
                        else:
                            filter_patterns.add(value)
        except OSError:
            pass

    @classmethod
    def load_fqdn_filter(cls, file_path=None):
        if cls.BLLIST_FQDN_FILTER:
            cls._load_filter(file_path or cls.BLLIST_FQDN_FILTER_FILE,
                             cls.BLLIST_FQDN_FILTER_PATTERNS, is_array=True)

    @classmethod
    def load_ip_filter(cls, file_path=None):
        if cls.BLLIST_IP_FILTER:
            cls._load_filter(file_path or cls.BLLIST_IP_FILTER_FILE,
                             cls.BLLIST_IP_FILTER_PATTERNS, is_array=True)

    @classmethod
    def load_gr_excluded_sld(cls, file_path=None):
        if cls.BLLIST_GR_EXCLUDED_SLD_FILE:
            cls._load_filter(file_path or cls.BLLIST_GR_EXCLUDED_SLD_FILE,
                             cls.BLLIST_GR_EXCLUDED_SLD_PATTERNS)

    @classmethod
    def load_gr_excluded_sld_masks(cls, file_path=None):
        if cls.BLLIST_GR_EXCLUDED_SLD_MASKS_FILE:
            cls._load_filter(file_path or cls.BLLIST_GR_EXCLUDED_SLD_MASKS_FILE,
                             cls.BLLIST_GR_EXCLUDED_SLD_MASKS_PATTERNS, is_array=True)

    @classmethod
    def load_gr_excluded_nets(cls, file_path=None):
        if cls.BLLIST_GR_EXCLUDED_NETS_FILE:
            cls._load_filter(file_path or cls.BLLIST_GR_EXCLUDED_NETS_FILE,
                             cls.BLLIST_GR_EXCLUDED_NETS_PATTERNS)

    @classmethod
    def load_fqdn_excluded(cls, file_path=None):
        if cls.BLLIST_FQDN_EXCLUDED_ENABLE:
            cls._load_filter(file_path or cls.BLLIST_FQDN_EXCLUDED_FILE,
                             cls.BLLIST_FQDN_EXCLUDED_ITEMS)

    @classmethod
    def load_ip_excluded(cls, file_path=None):
        if cls.BLLIST_IP_EXCLUDED_ENABLE:
            cls._load_filter(file_path or cls.BLLIST_IP_EXCLUDED_FILE,
                             cls.BLLIST_IP_EXCLUDED_ITEMS)

    @staticmethod
    def makeIPv4Network(s):
        net = None
        try:
            net = IPv4Network(s)
        except (AddressValueError, NetmaskValueError):
            pass
        return net

    @classmethod
    def load_cidr_excluded(cls, file_path=None):
        if cls.BLLIST_CIDR_EXCLUDED_ENABLE:
            cls._load_filter(file_path or cls.BLLIST_CIDR_EXCLUDED_FILE,
                             cls.BLLIST_CIDR_EXCLUDED_ITEMS, is_array=True,
                             func=cls.makeIPv4Network)

    @staticmethod
    def _check_filter(string, filter_patterns, reverse=False):
        if filter_patterns and string:
            for pattern in filter_patterns:
                if pattern and pattern.search(string):
                    return not reverse
        return reverse

    def check_sld_masks(self, sld):
        if self.BLLIST_GR_EXCLUDED_SLD_MASKS_PATTERNS:
            for pattern in self.BLLIST_GR_EXCLUDED_SLD_MASKS_PATTERNS:
                if re.fullmatch(pattern, sld):
                    return True
        return False

    def check_cidr_overlap(self, ip):
        if self.BLLIST_CIDR_EXCLUDED_ITEMS:
            try:
                ip_obj = IPv4Network(ip)
            except (AddressValueError, NetmaskValueError):
                pass
            else:
                for net in self.BLLIST_CIDR_EXCLUDED_ITEMS:
                    if net.overlaps(ip_obj):
                        return True
        return False


class ParserError(Exception):
    def __init__(self, reason=None):
        super().__init__(reason)
        self.reason = reason

    def __str__(self):
        return self.reason


class FieldValueError(ParserError):
    pass


class BlackListParser(Config):
    def __init__(self):
        self.ip_pattern = re.compile(r"(([0-9]{1,3}[.]){3})[0-9]{1,3}")
        self.cidr_pattern = re.compile(r"([0-9]{1,3}[.]){3}[0-9]{1,3}/[0-9]{1,2}")
        self.fqdn_pattern = re.compile(
            r"([а-яёa-z0-9_.*-]*?)([а-яёa-z0-9_-]+[.][а-яёa-z0-9-]+)", re.U)
        self.www_pattern = re.compile(r"^www[0-9]?[.]")
        self.cyr_pattern = re.compile(r"[а-яё]", re.U)
        self.cidr_set = set()
        self.ip_dict = {}
        self.ip_subnet_dict = {}
        self.fqdn_dict = {}
        self.sld_dict = {}
        self.cidr_count = 0
        self.ip_count = 0
        self.output_fqdn_count = 0
        self.ssl_unverified = False
        self.send_headers_dict = {
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/142.0",
        }
        ### Proxies (ex.: self.proxies = {"http": "http://192.168.0.1:8080", "https": "http://192.168.0.1:8080"})
        self.proxies = None
        self.connect_timeout = None
        self.data_chunk = 2048
        self.url = ["http://127.0.0.1"]
        self.records_separator = "\n"
        self.default_site_encoding = "utf-8"
        self.site_encoding = self.default_site_encoding
        self.rest = bytes()
        self.http_codes = set()

    @staticmethod
    def _compile_filter_patterns(filters_seq):
        return {
            re.compile(i, re.U)
            for i in filters_seq
                if i and type(i) == str
        }

    @contextmanager
    def _make_connection(self,
                        url,
                        method="GET",
                        postData=None,
                        send_headers_dict=None,
                        timeout=None):
        conn_object = http_code = received_headers = None
        req_object = request.Request(url,
                                    data=postData,
                                    headers=send_headers_dict,
                                    method=method)
        opener_args = [request.ProxyHandler(self.proxies)]
        if self.ssl_unverified:
            opener_args.append(request.HTTPSHandler(context=ssl._create_unverified_context()))
        try:
            conn_object = request.build_opener(*opener_args).open(
                req_object,
                timeout=(
                    timeout if type(timeout) == int else socket._GLOBAL_DEFAULT_TIMEOUT
                )
            )
            http_code, received_headers = conn_object.status, conn_object.getheaders()
        except Exception as exception_object:
            print(f" Connection error! {exception_object} ( {url} )",
                file=sys.stderr)
        try:
            yield (conn_object, http_code, received_headers)
        except Exception as exception_object:
            raise ParserError(f"Parser error! {exception_object} ( {url} )")
        finally:
            if conn_object:
                conn_object.close()

    def _download_data(self, url):
        with self._make_connection(
            url,
            send_headers_dict=self.send_headers_dict,
            timeout=self.connect_timeout
        ) as conn_params:
            conn_object, http_code, _ = conn_params
            self.http_codes.add(http_code)
            if http_code == 200:
                while True:
                    chunk = conn_object.read(self.data_chunk)
                    yield (chunk or None)
                    if not chunk:
                        break

    def prepare_data(self, url):
        for chunk in self._download_data(url):
            yield chunk

    def _align_chunk(self, url):
        for chunk in self.prepare_data(url):
            if chunk is None:
                yield self.rest
                continue
            data, _, self.rest = (self.rest + chunk).rpartition(self.records_separator)
            yield data

    def _split_entries(self, url):
        for chunk in self._align_chunk(url):
            for entry in chunk.split(self.records_separator):
                try:
                    yield entry.decode(
                        self.site_encoding or self.default_site_encoding)
                except UnicodeError:
                    pass

    def _get_subnet(self, ip_addr):
        regexp_obj = self.ip_pattern.fullmatch(ip_addr)
        return regexp_obj.group(1) if regexp_obj else None

    def ip_value_processing(self, value):
        if self.BLLIST_IP_EXCLUDED_ENABLE and value in self.BLLIST_IP_EXCLUDED_ITEMS:
            return
        if self.BLLIST_IP_FILTER and self._check_filter(
            value, self.BLLIST_IP_FILTER_PATTERNS, self.BLLIST_IP_FILTER_TYPE):
            return
        if self.ip_pattern.fullmatch(value) and value not in self.ip_dict:
            subnet = self._get_subnet(value)
            if subnet in self.BLLIST_GR_EXCLUDED_NETS_PATTERNS or (
                not self.BLLIST_IP_LIMIT or (
                    subnet not in self.ip_subnet_dict or self.ip_subnet_dict[subnet] < self.BLLIST_IP_LIMIT
                )
            ):
                self.ip_dict[value] = subnet
                self.ip_subnet_dict[subnet] = (self.ip_subnet_dict.get(subnet) or 0) + 1
        elif self.cidr_pattern.fullmatch(value):
            self.cidr_set.add(value)

    def _convert_to_punycode(self, string):
        if self.cyr_pattern.search(string):
            if self.BLLIST_ENABLE_IDN:
                try:
                    string = string.encode("idna").decode(
                        self.site_encoding or self.default_site_encoding)
                except UnicodeError:
                    pass
            else:
                raise FieldValueError()
        return string

    def _get_sld(self, fqdn):
        regexp_obj = self.fqdn_pattern.fullmatch(fqdn)
        return regexp_obj.group(2) if regexp_obj else None

    def fqdn_value_processing(self, value):
        if self.ip_pattern.fullmatch(value):
            raise FieldValueError()
        value = value.strip("*.").lower()
        if self.BLLIST_STRIP_WWW:
            value = self.www_pattern.sub("", value)
        if self.BLLIST_FQDN_EXCLUDED_ENABLE and value in self.BLLIST_FQDN_EXCLUDED_ITEMS:
            return
        if not self.BLLIST_FQDN_FILTER or (
            self.BLLIST_FQDN_FILTER and not self._check_filter(
                value, self.BLLIST_FQDN_FILTER_PATTERNS, self.BLLIST_FQDN_FILTER_TYPE)
        ):
            if self.fqdn_pattern.fullmatch(value):
                value = self._convert_to_punycode(value)
                sld = self._get_sld(value)
                if (sld in self.BLLIST_GR_EXCLUDED_SLD_PATTERNS or self.check_sld_masks(sld)) or (
                    not self.BLLIST_SD_LIMIT or (
                        sld not in self.sld_dict or self.sld_dict[sld] < self.BLLIST_SD_LIMIT
                    )
                ):
                    self.sld_dict[sld] = (self.sld_dict.get(sld) or 0) + 1
                    self.fqdn_dict[value] = sld
            else:
                raise FieldValueError()

    def parser_func(self):
        """Must be overridden by a subclass"""
        raise NotImplementedError()

    def _group_ip_ranges(self):
        if self.BLLIST_SUMMARIZE_IP:
            for i in Summarize.summarize_ip_ranges(self.ip_dict, True):
                self.cidr_set.add(i.with_prefixlen)
            self.ip_count = len(self.ip_dict)

    def _group_cidr_ranges(self):
        if self.BLLIST_SUMMARIZE_CIDR:
            for i in Summarize.summarize_nets(self.cidr_set):
                self.cidr_set.add(i.with_prefixlen)
        self.cidr_count = len(self.cidr_set)

    def run(self):
        ret_value = 1
        self.BLLIST_FQDN_FILTER_PATTERNS = self._compile_filter_patterns(self.BLLIST_FQDN_FILTER_PATTERNS)
        self.BLLIST_IP_FILTER_PATTERNS = self._compile_filter_patterns(self.BLLIST_IP_FILTER_PATTERNS)
        self.records_separator = bytes(self.records_separator, "utf-8")
        self.parser_func()
        if (len(self.ip_dict) + len(self.cidr_set) + len(self.fqdn_dict)) >= self.BLLIST_MIN_ENTRIES:
            ret_value = 0
        else:
            ret_value = 2
        for i in self.http_codes:
            if i != 200:
                ret_value = 2
                break
        self.rest = bytes()
        self.http_codes = set()
        return ret_value


class Summarize:
    HOSTS_LIMIT = 0
    NETS_LIMIT = 0

    @staticmethod
    def _sort_ip_func(e):
        return IPv4Address(e)

    @classmethod
    def _group_ip_ranges(cls, ip_list, raw_list=None):
        def remove_items(start, end):
            for ip in range(int(start), int(end) + 1):
                raw_list.remove(str(IPv4Address(ip)))

        start = end = None
        hosts = 1
        for ip in ip_list:
            ip_obj = IPv4Address(ip)
            if end and (end + 1) == ip_obj:
                hosts += 1
            else:
                if hosts > 1 and hosts >= cls.HOSTS_LIMIT:
                    if raw_list:
                        remove_items(start, end)
                    yield start, end
                start = ip_obj
                hosts = 1
            end = ip_obj
        else:
            if hosts > 1 and hosts >= cls.HOSTS_LIMIT:
                if raw_list:
                    remove_items(start, end)
                yield start, end

    @classmethod
    def summarize_ip_ranges(cls, ip_list, modify_raw_list=False):
        for s, e in cls._group_ip_ranges(sorted(ip_list, key=cls._sort_ip_func),
                                    modify_raw_list and ip_list):
            for i in summarize_address_range(s, e):
                if i.prefixlen == 32:
                    if modify_raw_list:
                        if type(ip_list) == set:
                            ip_list.add(i.network_address)
                        else:
                            ip_list.append(i.network_address)
                else:
                    yield i

    @staticmethod
    def _sort_net_func(e):
        return IPv4Network(e)

    @classmethod
    def _group_nets(cls, cidr_list, raw_list=None):
        def remove_items(start, end):
            for ip in range(int(start), int(end) + 1, 256):
                raw_list.remove(str(IPv4Address(ip)) + "/24")

        start = end = curr_super_net = None
        nets = 1
        for net in cidr_list:
            net_obj = IPv4Network(net)
            prefix_len = net_obj.prefixlen
            if prefix_len == 24:
                address = net_obj.network_address
                super_net = net_obj.supernet(new_prefix=16)
                if end and super_net == curr_super_net and (end + 256) == address:
                    nets += 1
                else:
                    if nets > 1 and nets >= cls.NETS_LIMIT:
                        if raw_list:
                            remove_items(start, end)
                        yield summarize_address_range(IPv4Address(start), IPv4Address(end + 255))
                    start = address
                    curr_super_net = super_net
                    nets = 1
                end = address
        else:
            if nets > 1 and nets >= cls.NETS_LIMIT:
                if raw_list:
                    remove_items(start, end)
                yield summarize_address_range(IPv4Address(start), IPv4Address(end + 255))

    @classmethod
    def summarize_nets(cls, cidr_list):
        for i in cls._group_nets(sorted(cidr_list, key=cls._sort_net_func), cidr_list):
            for j in i:
                yield j


class OptimizeConfig(Config):
    def __init__(self, parsers_list):
        self.parsers_list = parsers_list
        self.cidr_set = set()
        self.ip_dict = {}
        self.ip_subnet_dict = {}
        self.fqdn_dict = {}
        self.sld_dict = {}
        self.cidr_count = 0
        self.ip_count = 0
        self.output_fqdn_count = 0

    def _exclude_nets(self):
        if self.BLLIST_CIDR_EXCLUDED_ENABLE:
            ip_dict = {}
            for ip, subnet in self.ip_dict.items():
                if not self.check_cidr_overlap(ip):
                    ip_dict[ip] = subnet
            self.ip_dict = ip_dict
            cidr_set = set()
            for net in self.cidr_set:
                if not self.check_cidr_overlap(net):
                    cidr_set.add(net)
            self.cidr_set = cidr_set

    def _remove_subdomains(self):
        tld_dict = {}
        for fqdn, sld in self.fqdn_dict.items():
            tld_dict.setdefault(sld, [])
            tld_dict[sld].append(fqdn)
        for v in tld_dict.values():
            for i in v:
                if i in self.fqdn_dict:
                    for j in v:
                        if (j != i) and j.endswith("." + i):
                            self.fqdn_dict.pop(j, None)

    def _optimize_fqdn_dict(self):
        optimized_set = set()
        for fqdn, sld in self.fqdn_dict.items():
            if sld and (fqdn == sld or sld not in self.fqdn_dict) and self.sld_dict.get(sld):
                if (not self.check_sld_masks(sld) and (
                        self.BLLIST_SD_LIMIT and sld not in self.BLLIST_GR_EXCLUDED_SLD_PATTERNS
                )) and (self.sld_dict[sld] >= self.BLLIST_SD_LIMIT):
                    record_value = sld
                    del(self.sld_dict[sld])
                else:
                    record_value = fqdn
                optimized_set.add(record_value)
                self.output_fqdn_count += 1
        self.fqdn_dict = optimized_set

    def _optimize_ip_dict(self):
        optimized_set = set()
        for ip_addr, subnet in self.ip_dict.items():
            if subnet in self.ip_subnet_dict:
                if subnet not in self.BLLIST_GR_EXCLUDED_NETS_PATTERNS and (
                    self.BLLIST_IP_LIMIT and self.ip_subnet_dict[subnet] >= self.BLLIST_IP_LIMIT
                ):
                    self.cidr_set.add(f"{subnet}0/24")
                    del(self.ip_subnet_dict[subnet])
                else:
                    optimized_set.add(ip_addr)
                    self.ip_count += 1
        self.ip_dict = optimized_set

    def _group_ip_ranges(self):
        if self.BLLIST_SUMMARIZE_IP:
            for i in Summarize.summarize_ip_ranges(self.ip_dict, True):
                self.cidr_set.add(i.with_prefixlen)
            self.ip_count = len(self.ip_dict)

    def _group_cidr_ranges(self):
        if self.BLLIST_SUMMARIZE_CIDR:
            for i in Summarize.summarize_nets(self.cidr_set):
                self.cidr_set.add(i.with_prefixlen)
        self.cidr_count = len(self.cidr_set)

    def optimize(self):
        for i in self.parsers_list:
            self.cidr_set |= i.cidr_set
            self.ip_dict.update(i.ip_dict)
            self.ip_subnet_dict.update(i.ip_subnet_dict)
            self.fqdn_dict.update(i.fqdn_dict)
            self.sld_dict.update(i.sld_dict)
        self._exclude_nets()
        self._remove_subdomains()
        self._optimize_fqdn_dict()
        self._optimize_ip_dict()
        self._group_ip_ranges()
        self._group_cidr_ranges()


class WriteConfigFiles(Config):
    def __init__(self):
        self.write_buffer = -1

    def write_ipset_config(self, ip_dict, cidr_set):
        with open(self.IP_DATA_FILE, "wt", buffering=self.write_buffer) as file_handler:
            for i in (self.NFTSET_CIDR, self.NFTSET_IP):
                file_handler.write("flush set {} {}\n".format(self.NFT_TABLE, i))
            file_handler.write(
                "table {} {{\n{}".format(self.NFT_TABLE, self.NFTSET_CIDR_STRING_MAIN)
            )
            if len(cidr_set) > 0:
                file_handler.write("elements={")
                for i in cidr_set:
                    file_handler.write(f"{i},")
                file_handler.write("};")
            file_handler.write(
                "}}\n{}".format(self.NFTSET_IP_STRING_MAIN)
            )
            if len(ip_dict) > 0:
                file_handler.write("elements={")
                for i in ip_dict:
                    file_handler.write(f"{i},")
                file_handler.write("};")
            file_handler.write("}\n}\n")

    def write_dnsmasq_config(self, fqdn_dict):
        with open(self.DNSMASQ_DATA_FILE, "wt", buffering=self.write_buffer) as file_handler:
            for fqdn in fqdn_dict:
                file_handler.write(
                    f"server=/{fqdn}/{self.BLLIST_ALT_DNS_ADDR}\nnftset=/{fqdn}/{self.NFT_TABLE_DNSMASQ}#{self.NFTSET_DNSMASQ}\n"
                    if self.BLLIST_ALT_NSLOOKUP else
                    f"nftset=/{fqdn}/{self.NFT_TABLE_DNSMASQ}#{self.NFTSET_DNSMASQ}\n")

    def write_update_status_file(self, ip_count, cidr_count, fqdn_count):
        with open(self.UPDATE_STATUS_FILE, "wt") as file_handler:
            file_handler.write(
                f"{cidr_count} {ip_count} {fqdn_count}")


class RblFQDN(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.RBL_ALL_URL
        self.records_separator = '{"appearDate": '
        self.ips_separator = ", "

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                res = re.search(r'"domains": \["?(.*?)"?\].*?"ips": \[([a-f0-9/.:", ]*)\]', entry)
                if not res:
                    continue
                ip_string = res.group(2).replace('"', "")
                fqdn_string = res.group(1)
                if fqdn_string:
                    try:
                        self.fqdn_value_processing(fqdn_string)
                    except FieldValueError:
                        for i in ip_string.split(self.ips_separator):
                            self.ip_value_processing(i)
                else:
                    for i in ip_string.split(self.ips_separator):
                        self.ip_value_processing(i)

class RblDPI(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.RBL_DPI_URL
        self.BLLIST_MIN_ENTRIES = 0
        self.records_separator = '{"domains"'

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                res = re.search(r': \[(.*?)\]', entry)
                if not res:
                    continue
                fqdn_string = res.group(1)
                if fqdn_string:
                    for i in fqdn_string.split(', "'):
                        try:
                            self.fqdn_value_processing(i.strip('"'))
                        except FieldValueError:
                            pass

class RblIp(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.RBL_IP_URL
        self.records_separator = ","

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                self.ip_value_processing(re.sub(r'[\[\]" ]', "", entry))


class ZiFQDN(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.ZI_ALL_URL
        self.site_encoding = self.ZI_ENCODING
        self.fields_separator = ";"
        self.ips_separator = "|"
        # self.decomp_obj = zlib.decompressobj(wbits=47)

    # def prepare_data(self, url):
    #     """
    #     for https://raw.githubusercontent.com/zapret-info/z-i/master/dump.csv.gz
    #     """
    #     for chunk in self._download_data(url):
    #         if chunk:
    #             data = self.decomp_obj.decompress(chunk)
    #             yield data

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                entry_list = entry.split(self.fields_separator)
                try:
                    if entry_list[1]:
                        try:
                            self.fqdn_value_processing(entry_list[1])
                        except FieldValueError:
                            for i in entry_list[0].split(self.ips_separator):
                                self.ip_value_processing(i)
                    else:
                        for i in entry_list[0].split(self.ips_separator):
                                self.ip_value_processing(i)
                except IndexError:
                    pass


class ZiIp(ZiFQDN):
    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                entry_list = entry.split(self.fields_separator)
                for i in entry_list[0].split(self.ips_separator):
                    self.ip_value_processing(i)

class AfFQDN(BlackListParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url = self.AF_FQDN_URL

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                try:
                    self.fqdn_value_processing(entry)
                except FieldValueError:
                    self.ip_value_processing(entry)


class AfIp(BlackListParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url = self.AF_IP_URL

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                self.ip_value_processing(entry)


class FzFQDN(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.FZ_URL
        self.site_encoding = self.FZ_ENCODING
        self.records_separator = "</content>"
        self.fqdn_value_regexp = re.compile(r"<domain><\!\[CDATA\[(.*?)\]\]></domain>", re.U)
        self.ip_value_regexp = re.compile(r"<ip>(.*?)</ip>")
        self.cidr_value_regexp = re.compile(r"<ipSubnet>(.*?)</ipSubnet>")

    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                res = self.fqdn_value_regexp.search(entry)
                if res and res.group(1):
                    try:
                        self.fqdn_value_processing(res.group(1))
                    except FieldValueError:
                        pass
                    else:
                        continue
                for i in self.ip_value_regexp.finditer(entry):
                    if i.group(1):
                        self.ip_value_processing(i.group(1))
                for i in self.cidr_value_regexp.finditer(entry):
                    if i.group(1):
                        self.ip_value_processing(i.group(1))


class FzIp(FzFQDN):
    def parser_func(self):
        for url in self.url:
            for entry in self._split_entries(url):
                for i in self.ip_value_regexp.finditer(entry):
                    if i.group(1):
                        self.ip_value_processing(i.group(1))
                for i in self.cidr_value_regexp.finditer(entry):
                    if i.group(1):
                        self.ip_value_processing(i.group(1))


class Ra(BlackListParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url_ipset = self.DL_IPSET_URL
        self.url_dnsmasq = self.DL_DMASK_URL
        self.url_stat = self.DL_STAT_URL

    def download_config(self, url, cfg_file):
        self.url = url
        file_handler = None
        for chunk in self._download_data(self.url[0]):
            if chunk:
                if not file_handler:
                    try:
                        file_handler = open(cfg_file, "wb", buffering=-1)
                    except Exception:
                        break
                if file_handler:
                    file_handler.write(chunk)
        if file_handler:
            file_handler.close()
        file_handler = None

    def run(self):
        ret_value = 0
        self.download_config(self.url_ipset, self.IP_DATA_FILE)
        self.download_config(self.url_dnsmasq, self.DNSMASQ_DATA_FILE)
        self.download_config(self.url_stat, self.UPDATE_STATUS_FILE)
        for i in self.http_codes:
           if i != 200:
                ret_value = 2
                break
        self.http_codes = set()
        return ret_value


if __name__ == "__main__":
    Config.load_environ_config()
    Config.load_fqdn_filter()
    Config.load_ip_filter()
    Config.load_gr_excluded_sld()
    Config.load_gr_excluded_sld_masks()
    Config.load_gr_excluded_nets()
    Config.load_fqdn_excluded()
    Config.load_ip_excluded()
    Config.load_cidr_excluded()
    parsers_dict = {
        "ip": {"rublacklist": [RblIp], "zapret-info": [ZiIp], "antifilter": [AfIp], "fz": [FzIp], "ruantiblock": [Ra]},
        "fqdn": {"rublacklist": [RblFQDN, RblDPI], "zapret-info": [ZiFQDN], "antifilter": [AfFQDN], "fz": [FzFQDN], "ruantiblock": [Ra]},
    }
    try:
        parser_classes = parsers_dict[Config.BLLIST_MODE][Config.BLLIST_SOURCE]
    except KeyError:
        print("Wrong configuration! (Config.BLLIST_MODE, Config.BLLIST_SOURCE)",
              file=sys.stderr)
        sys.exit(1)
    parser_instances = [i() for i in parser_classes]
    ret_list = [i.run() for i in parser_instances]
    if sum(ret_list) == 0 and Config.BLLIST_SOURCE != "ruantiblock":
        oc_obj = OptimizeConfig(parser_instances)
        oc_obj.optimize()
        write_cfg_obj = WriteConfigFiles()
        write_cfg_obj.write_dnsmasq_config(oc_obj.fqdn_dict)
        write_cfg_obj.write_ipset_config(oc_obj.ip_dict, oc_obj.cidr_set)
        write_cfg_obj.write_update_status_file(oc_obj.ip_count, oc_obj.cidr_count, oc_obj.output_fqdn_count)
    sys.exit(1 if 1 in ret_list else (2 if 2 in ret_list else 0))
