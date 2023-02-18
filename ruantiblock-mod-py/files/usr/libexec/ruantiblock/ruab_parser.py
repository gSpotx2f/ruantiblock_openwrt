#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
(с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)

 Python >= 3.6
"""

from contextlib import contextmanager
import os
import re
import socket
import ssl
import sys
from urllib import request
from ruab_sum_ip import summarize_ip_ranges, summarize_nets


class Config:
    environ_list = [
        "BLLIST_SOURCE",
        "BLLIST_MODE",
        "BLLIST_ALT_NSLOOKUP",
        "BLLIST_ALT_DNS_ADDR",
        "BLLIST_ENABLE_IDN",
        "BLLIST_GR_EXCLUDED_SLD",
        "BLLIST_GR_EXCLUDED_MASKS",
        "BLLIST_FQDN_FILTER",
        "BLLIST_FQDN_FILTER_TYPE",
        "BLLIST_FQDN_FILTER_FILE",
        "BLLIST_IP_FILTER",
        "BLLIST_IP_FILTER_TYPE",
        "BLLIST_IP_FILTER_FILE",
        "BLLIST_SD_LIMIT",
        "BLLIST_IP_LIMIT",
        "BLLIST_GR_EXCLUDED_NETS",
        "BLLIST_MIN_ENTRIES",
        "BLLIST_STRIP_WWW",
        "NFT_TABLE",
        "NFT_TABLE_DNSMASQ",
        "NFTSET_CIDR",
        "NFTSET_IP",
        "NFTSET_DNSMASQ",
        "NFTSET_CIDR_CFG",
        "NFTSET_IP_CFG",
        "NFTSET_DNSMASQ",
        "DNSMASQ_DATA_FILE",
        "IP_DATA_FILE",
        "UPDATE_STATUS_FILE",
        "RBL_ALL_URL",
        "RBL_IP_URL",
        "ZI_ALL_URL",
        "AF_IP_URL",
        "AF_FQDN_URL",
        "RA_IP_NFTSET_URL",
        "RA_IP_DMASK_URL",
        "RA_IP_STAT_URL",
        "RA_FQDN_NFTSET_URL",
        "RA_FQDN_DMASK_URL",
        "RA_FQDN_STAT_URL",
        "RBL_ENCODING",
        "ZI_ENCODING",
        "AF_ENCODING",
        "RA_ENCODING",
        "BLLIST_SUMMARIZE_IP",
        "BLLIST_SUMMARIZE_CIDR",
    ]
    BLLIST_FQDN_FILTER_PATTERNS = set()
    BLLIST_IP_FILTER_PATTERNS = set()

    @classmethod
    def _load_config(cls, cfg_dict):

        def normalize_string(string):
            return re.sub('"', '', string)

        config_arrays = {
            "BLLIST_GR_EXCLUDED_SLD",
            "BLLIST_GR_EXCLUDED_NETS",
        }
        try:
            for k, v in cfg_dict.items():
                if k in config_arrays:
                    value = {normalize_string(i) for i in v.split(" ")}
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
    def _load_filter(cls, file_path, filter_patterns):
        try:
            with open(file_path, "rt") as file_handler:
                for line in file_handler:
                    if line and re.match("[^#]", line):
                        filter_patterns.add(line.strip())
        except OSError:
            pass

    @classmethod
    def load_fqdn_filter(cls, file_path=None):
        if cls.BLLIST_FQDN_FILTER:
            cls._load_filter(file_path or cls.BLLIST_FQDN_FILTER_FILE, cls.BLLIST_FQDN_FILTER_PATTERNS)

    @classmethod
    def load_ip_filter(cls, file_path=None):
        if cls.BLLIST_IP_FILTER:
            cls._load_filter(file_path or cls.BLLIST_IP_FILTER_FILE, cls.BLLIST_IP_FILTER_PATTERNS)


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
            r"([а-яёa-z0-9_.*-]*?)([а-яёa-z0-9_-]+[.][а-яёa-z0-9-]+)",
            re.U)
        self.www_pattern = re.compile(r"^www[0-9]?[.]")
        self.cyr_pattern = re.compile(r"[а-яё]", re.U)
        self.cidr_set = set()
        self.ip_set = {}
        self.ip_subnet_dict = {}
        self.fqdn_set = {}
        self.sld_dict = {}
        self.cidr_count = 0
        self.ip_count = 0
        self.output_fqdn_count = 0
        self.ssl_unverified = False
        self.send_headers_dict = {
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0",
        }
        ### Proxies (ex.: self.proxies = {"http": "http://192.168.0.1:8080", "https": "http://192.168.0.1:8080"})
        self.proxies = None
        self.connect_timeout = None
        self.data_chunk = 2048
        self.url = "http://127.0.0.1"
        self.records_separator = "\n"
        self.fields_separator = ";"
        self.ips_separator = "|"
        self.default_site_encoding = "utf-8"
        self.site_encoding = self.default_site_encoding

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
            raise ParserError(f"Parser error! {exception_object} ( {self.url} )")
        finally:
            if conn_object:
                conn_object.close()

    def _download_data(self):
        with self._make_connection(
            self.url,
            send_headers_dict=self.send_headers_dict,
            timeout=self.connect_timeout
        ) as conn_params:
            conn_object, http_code, _ = conn_params
            if http_code == 200:
                while True:
                    chunk = conn_object.read(self.data_chunk)
                    yield (chunk or None)
                    if not chunk:
                        break

    def _align_chunk(self):
        rest = bytes()
        for chunk in self._download_data():
            if chunk is None:
                yield rest
                continue
            data, _, rest = (rest + chunk).rpartition(self.records_separator)
            yield data

    def _split_entries(self):
        for chunk in self._align_chunk():
            for entry in chunk.split(self.records_separator):
                try:
                    yield entry.decode(
                        self.site_encoding or self.default_site_encoding)
                except UnicodeError:
                    pass

    @staticmethod
    def _check_filter(string, filter_patterns, reverse=False):
        if filter_patterns and string:
            for pattern in filter_patterns:
                if pattern and pattern.search(string):
                    return not reverse
        return reverse

    def _get_subnet(self, ip_addr):
        regexp_obj = self.ip_pattern.fullmatch(ip_addr)
        return regexp_obj.group(1) if regexp_obj else None

    def ip_field_processing(self, string):
        for i in string.split(self.ips_separator):
            if self.BLLIST_IP_FILTER and self._check_filter(
                i, self.BLLIST_IP_FILTER_PATTERNS, self.BLLIST_IP_FILTER_TYPE):
                continue
            if self.ip_pattern.fullmatch(i) and i not in self.ip_set:
                subnet = self._get_subnet(i)
                if subnet in self.BLLIST_GR_EXCLUDED_NETS or (
                    not self.BLLIST_IP_LIMIT or (
                        subnet not in self.ip_subnet_dict or self.ip_subnet_dict[subnet] < self.BLLIST_IP_LIMIT
                    )
                ):
                    self.ip_set[i] = subnet
                    self.ip_subnet_dict[subnet] = (self.ip_subnet_dict.get(subnet) or 0) + 1
            elif self.cidr_pattern.fullmatch(i) and i not in self.cidr_set:
                self.cidr_set.add(i)

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

    def fqdn_field_processing(self, string):
        if self.ip_pattern.fullmatch(string):
            raise FieldValueError()
        string = string.strip("*.").lower()
        if self.BLLIST_STRIP_WWW:
            string = self.www_pattern.sub("", string)
        if not self.BLLIST_FQDN_FILTER or (
            self.BLLIST_FQDN_FILTER and not self._check_filter(
                string, self.BLLIST_FQDN_FILTER_PATTERNS, self.BLLIST_FQDN_FILTER_TYPE)
        ):
            if self.fqdn_pattern.fullmatch(string):
                string = self._convert_to_punycode(string)
                sld = self._get_sld(string)
                if sld in self.BLLIST_GR_EXCLUDED_SLD or (
                    not self.BLLIST_SD_LIMIT or (
                        sld not in self.sld_dict or self.sld_dict[sld] < self.BLLIST_SD_LIMIT
                    )
                ):
                    self.sld_dict[sld] = (self.sld_dict.get(sld) or 0) + 1
                    self.fqdn_set[string] = sld
            else:
                raise FieldValueError()

    def parser_func(self):
        """Must be overridden by a subclass"""
        raise NotImplementedError()

    def _check_sld_masks(self, sld):
        if self.BLLIST_GR_EXCLUDED_MASKS:
            for pattern in self.BLLIST_GR_EXCLUDED_MASKS:
                if re.fullmatch(pattern, sld):
                    return True
        return False

    def _optimize_fqdn_set(self):
        optimized_set = set()
        for fqdn, sld in self.fqdn_set.items():
            if sld and (fqdn == sld or sld not in self.fqdn_set) and self.sld_dict.get(sld):
                if (not self._check_sld_masks(sld) and (
                        self.BLLIST_SD_LIMIT and sld not in self.BLLIST_GR_EXCLUDED_SLD
                )) and (self.sld_dict[sld] >= self.BLLIST_SD_LIMIT):
                    record_value = sld
                    del(self.sld_dict[sld])
                else:
                    record_value = fqdn
                optimized_set.add(record_value)
                self.output_fqdn_count += 1
        self.fqdn_set = optimized_set

    def _optimize_ip_set(self):
        optimized_set = set()
        for ip_addr, subnet in self.ip_set.items():
            if subnet in self.ip_subnet_dict:
                if subnet not in self.BLLIST_GR_EXCLUDED_NETS and (
                    self.BLLIST_IP_LIMIT and self.ip_subnet_dict[subnet] >= self.BLLIST_IP_LIMIT
                ):
                    self.cidr_set.add(f"{subnet}0/24")
                    del(self.ip_subnet_dict[subnet])
                else:
                    optimized_set.add(ip_addr)
                    self.ip_count += 1
        self.ip_set = optimized_set

    def _group_ip_ranges(self):
        if self.BLLIST_SUMMARIZE_IP:
            for i in summarize_ip_ranges(self.ip_set, True):
                self.cidr_set.add(i.with_prefixlen)
            self.ip_count = len(self.ip_set)

    def _group_cidr_ranges(self):
        if self.BLLIST_SUMMARIZE_CIDR:
            for i in summarize_nets(self.cidr_set):
                self.cidr_set.add(i.with_prefixlen)
        self.cidr_count = len(self.cidr_set)

    def run(self):
        ret_value = 1
        self.BLLIST_FQDN_FILTER_PATTERNS = self._compile_filter_patterns(self.BLLIST_FQDN_FILTER_PATTERNS)
        self.BLLIST_IP_FILTER_PATTERNS = self._compile_filter_patterns(self.BLLIST_IP_FILTER_PATTERNS)
        self.records_separator = bytes(self.records_separator, "utf-8")
        self.parser_func()
        if (len(self.ip_set) + len(self.cidr_set) + len(self.fqdn_set)) >= self.BLLIST_MIN_ENTRIES:
            self._optimize_fqdn_set()
            self._optimize_ip_set()
            self._group_ip_ranges()
            self._group_cidr_ranges()
            ret_value = 0
        else:
            ret_value = 2
        return ret_value


class RblFQDN(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.RBL_ALL_URL
        self.records_separator = '{"authority": '
        self.ips_separator = ", "

    def parser_func(self):
        for entry in self._split_entries():
            res = re.search(r'"domains": \["?(.*?)"?\].*?"ips": \[([a-f0-9/.:", ]*)\]', entry)
            if not res:
                continue
            ip_string = res.group(2).replace('"', "")
            fqdn_string = res.group(1)
            if fqdn_string:
                try:
                    self.fqdn_field_processing(fqdn_string)
                except FieldValueError:
                    self.ip_field_processing(ip_string)
            else:
                self.ip_field_processing(ip_string)


class RblIp(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.RBL_IP_URL
        self.records_separator = ","

    def parser_func(self):
        for entry in self._split_entries():
            self.ip_field_processing(re.sub(r'[\[\]" ]', "", entry))


class ZiFQDN(BlackListParser):
    def __init__(self):
        super().__init__()
        self.url = self.ZI_ALL_URL
        self.site_encoding = self.ZI_ENCODING

    def parser_func(self):
        for entry in self._split_entries():
            entry_list = entry.split(self.fields_separator)
            try:
                if entry_list[1]:
                    try:
                        self.fqdn_field_processing(entry_list[1])
                    except FieldValueError:
                        self.ip_field_processing(entry_list[0])
                else:
                    self.ip_field_processing(entry_list[0])
            except IndexError:
                pass


class ZiIp(ZiFQDN):
    def parser_func(self):
        for entry in self._split_entries():
            entry_list = entry.split(self.fields_separator)
            self.ip_field_processing(entry_list[0])


class AfFQDN(BlackListParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url = self.AF_FQDN_URL

    def parser_func(self):
        for entry in self._split_entries():
            try:
                self.fqdn_field_processing(entry)
            except FieldValueError:
                self.ip_field_processing(entry)


class AfIp(BlackListParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url = self.AF_IP_URL

    def parser_func(self):
        for entry in self._split_entries():
            self.ip_field_processing(entry)


class RaFQDN(BlackListParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url_ipset = self.RA_FQDN_IPSET_URL
        self.url_dnsmasq = self.RA_FQDN_DMASK_URL
        self.url_stat = self.RA_FQDN_STAT_URL
        self.current_file_handler = None

    def parser_func(self):
        for chunk in self._download_data():
            if chunk:
                self.current_file_handler.write(chunk)

    def download_config(self, url, cfg_file):
        self.url = url
        with open(cfg_file, "wb", buffering=-1) as self.current_file_handler:
            self.parser_func()

    def run(self):
        self.download_config(self.url_ipset, self.IP_DATA_FILE)
        self.download_config(self.url_dnsmasq, self.DNSMASQ_DATA_FILE)
        self.download_config(self.url_stat, self.UPDATE_STATUS_FILE)
        return 0


class RaIp(RaFQDN):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url_ipset = self.RA_IP_IPSET_URL
        self.url_dnsmasq = self.RA_IP_DMASK_URL
        self.url_stat = self.RA_IP_STAT_URL


class WriteConfigFiles(Config):
    def __init__(self):
        self.write_buffer = -1

    def write_ipset_config(self, ip_set, cidr_set):
        with open(self.IP_DATA_FILE, "wt", buffering=self.write_buffer) as file_handler:
            for i in (self.NFTSET_CIDR, self.NFTSET_IP):
                file_handler.write("flush set {} {}\n".format(self.NFT_TABLE, i))
            file_handler.write(
                "table {} {{\n{}".format(self.NFT_TABLE, self.NFTSET_CIDR_CFG)
            )
            if len(cidr_set) > 0:
                file_handler.write("elements={")
                for i in cidr_set:
                    file_handler.write(f"{i},")
                file_handler.write("};")
            file_handler.write(
                "}}\n{}".format(self.NFTSET_IP_CFG)
            )
            if len(ip_set) > 0:
                file_handler.write("elements={")
                for i in ip_set:
                    file_handler.write(f"{i},")
                file_handler.write("};")
            file_handler.write("}\n}\n")

    def write_dnsmasq_config(self, fqdn_set):
        with open(self.DNSMASQ_DATA_FILE, "wt", buffering=self.write_buffer) as file_handler:
            for fqdn in fqdn_set:
                file_handler.write(
                    f"server=/{fqdn}/{self.BLLIST_ALT_DNS_ADDR}\nnftset=/{fqdn}/{self.NFT_TABLE_DNSMASQ}#{self.NFTSET_DNSMASQ}\n"
                    if self.BLLIST_ALT_NSLOOKUP else
                    f"nftset=/{fqdn}/{self.NFT_TABLE_DNSMASQ}#{self.NFTSET_DNSMASQ}\n")

    def write_update_status_file(self, ip_count, cidr_count, output_fqdn_count):
        with open(self.UPDATE_STATUS_FILE, "wt") as file_handler:
            file_handler.write(
                f"{cidr_count} {ip_count} {output_fqdn_count}")


if __name__ == "__main__":
    Config.load_environ_config()
    Config.load_fqdn_filter()
    Config.load_ip_filter()
    ctx_dict = {
        "ip": {"rublacklist": RblIp, "zapret-info": ZiIp, "antifilter": AfIp, "ruantiblock": RaIp},
        "fqdn": {"rublacklist": RblFQDN, "zapret-info": ZiFQDN, "antifilter": AfFQDN, "ruantiblock": RaFQDN},
    }
    write_cfg_obj = WriteConfigFiles()
    try:
        ctx = ctx_dict[Config.BLLIST_MODE][Config.BLLIST_SOURCE]()
    except KeyError:
        print("Wrong configuration! (Config.BLLIST_MODE or Config.BLLIST_SOURCE)",
              file=sys.stderr)
        sys.exit(1)
    ret_code = ctx.run()
    if ret_code == 0 and Config.BLLIST_SOURCE != "ruantiblock":
        write_cfg_obj.write_dnsmasq_config(ctx.fqdn_set)
        write_cfg_obj.write_ipset_config(ctx.ip_set, ctx.cidr_set)
        write_cfg_obj.write_update_status_file(ctx.ip_count, ctx.cidr_count, ctx.output_fqdn_count)
    sys.exit(ret_code)
