# -*- coding: utf-8 -*-
# (с) 2020 gSpot (https://github.com/gSpotx2f/ruantiblock_openwrt)

from ipaddress import IPv4Address, IPv4Network, summarize_address_range
from typing import List, Tuple, Set, Union

HOSTS_LIMIT: int = 0
NETS_LIMIT: int = 0


def _sort_ip_func(e: str) -> IPv4Address:
    return IPv4Address(e)


def _group_ip_ranges(ip_list: List, raw_list: Union[List, Set] = None) -> Tuple:
    def remove_items(start: IPv4Address, end: IPv4Address) -> None:
        for ip in range(int(start), int(end) + 1):
            raw_list.remove(str(IPv4Address(ip)))

    start = end = None
    hosts = 1
    for ip in ip_list:
        ip_obj = IPv4Address(ip)
        if end and (end + 1) == ip_obj:
            hosts += 1
        else:
            if hosts > 1 and hosts >= HOSTS_LIMIT:
                if raw_list:
                    remove_items(start, end)
                yield start, end
            start = ip_obj
            hosts = 1
        end = ip_obj
    else:
        if hosts > 1 and hosts >= HOSTS_LIMIT:
            if raw_list:
                remove_items(start, end)
            yield start, end


def summarize_ip_ranges(ip_list: Union[List, Set], modify_raw_list: bool = False) -> IPv4Network:
    for s, e in _group_ip_ranges(sorted(ip_list, key=_sort_ip_func),
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


def _sort_net_func(e: str) -> IPv4Network:
    return IPv4Network(e)


def _group_nets(cidr_list: List, raw_list: Union[List, Set] = None) -> IPv4Network:
    def remove_items(start: IPv4Address, end: IPv4Address) -> None:
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
                if nets > 1 and nets >= NETS_LIMIT:
                    if raw_list:
                        remove_items(start, end)
                    yield summarize_address_range(IPv4Address(start), IPv4Address(end + 255))
                start = address
                curr_super_net = super_net
                nets = 1
            end = address
    else:
        if nets > 1 and nets >= NETS_LIMIT:
            if raw_list:
                remove_items(start, end)
            yield summarize_address_range(IPv4Address(start), IPv4Address(end + 255))


def summarize_nets(cidr_list: Union[List, Set]) -> IPv4Network:
    for i in _group_nets(sorted(cidr_list, key=_sort_net_func), cidr_list):
        for j in i:
            yield j
