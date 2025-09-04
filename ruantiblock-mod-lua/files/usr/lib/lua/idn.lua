--[[
GitHub: https://github.com/haste/lua-idn/

MIT License

Copyright (c) 2011 Trond A Ekseth <troeks@gmail.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
--]]

local bit = require'bit'

local base = 36
local tmin = 1
local tmax = 26
local skew = 38
local damp = 700
local initial_bias = 72
local initial_n = 0x80
local delimiter = 0x2D

-- Bias adaptation function
local adapt = function(delta, numpoints, firsttime)
	if(firsttime) then
		delta = math.floor(delta / damp)
	else
		delta = bit.rshift(delta, 1)
	end

	delta = delta + math.floor(delta / numpoints)

	local k = 0
	while(delta > math.floor(((base - tmin) * tmax) / 2)) do
		delta = math.floor(delta / (base - tmin))
		k = k + base
	end

	return math.floor(k + (base - tmin + 1) * delta / (delta + skew))
end

-- tests whether cp is a basic code point:
local basic = function(cp)
	return cp < 0x80
end

local offset = {0, 0x3000, 0xE0000, 0x3C00000}
local utf8code = function(U, ...)
	local numBytes = select('#', ...)
	for i=1, numBytes do
		local b = select(i, ...)
		U = bit.lshift(U, 6) + bit.band(b, 63)
	end

	return U - offset[numBytes + 1]
end

local toUCS4 = function(str)
	local out = {}
	for c in str:gmatch'([%z\1-\127\194-\244][\128-\191]*)' do
		table.insert(out, utf8code(string.byte(c, 1, -1)))
	end

	return out
end

local toUnicode = function(n)
	if(n < 128) then
		return string.char(n)
	elseif(n < 2048) then
		return string.char(192 + ((n - (n % 64)) / 64), 128 + (n % 64))
	else
		return string.char(224 + ((n - (n % 4096)) / 4096), 128 + (((n % 4096) - (n % 64)) / 64), 128 + (n % 64))
	end
end

local punycode_encode
do
	-- returns the basic code point whose value
	-- (when used for representing integers) is d, which needs to be in
	-- the range 0 to base-1.
	local encode_digit = function(d)
		return d + 22 + 75 * (d < 26 and 1 or 0)
		--  0..25 map to ASCII a..z
		-- 26..35 map to ASCII 0..9
	end

	function punycode_encode(input)
		if(type(input) == 'string') then
			input = toUCS4(input)
		end

		local output = {}

		-- Initialize the state
		local n = initial_n
		local delta = 0
		local bias = initial_bias

		-- Handle the basic code poinst
		for j = 1, #input do
			local c = input[j]
			if(basic(c)) then
				table.insert(output, string.char(c))
			end
		end

		local h = #output
		local b = h

		-- h is the number of code points that have been handled, b is the
		-- number of basic code points.

		if(b > 0) then
			table.insert(output, string.char(delimiter))
		end

		-- Main encoding loop
		while(h < #input) do
			-- All non-basic code points < n have been
			-- handled already.  Find the next larger one
			local m = math.huge
			for j = 1, #input do
				local c = input[j]
				if(c >= n and c < m) then
					m = c
				end
			end

			delta = delta + (m - n) * (h + 1)
			n = m

			for j = 1, #input do
				local cp = input[j]
				if(cp < n) then
					delta = delta + 1
				end

				if(cp == n) then
					local q = delta
					local k = base
					while(true) do
						local t
						if(k <= bias) then
							t = tmin
						else
							if(k >= bias + tmax) then
								t = tmax
							else
								t = k - bias
							end
						end

						if(q < t) then break end

						table.insert(output, string.char(encode_digit(t + (q - t) % (base - t))))
						q = math.floor((q - t) / (base - t))

						k = k + base
					end

					table.insert(output, string.char(encode_digit(q)))
					bias = adapt(delta, h + 1, h == b)
					delta = 0
					h = h +1
				end
			end

			delta = delta + 1
			n = n + 1
		end

		return table.concat(output)
	end
end

local punycode_decode
do
	local decode_digit = function(d)
		if(d - 48 < 10) then
			return d - 22
		elseif(d - 65 < 26) then
			return d - 65
		elseif(d - 97 < 26) then
			return d - 97
		else
			return base
		end
	end

	function punycode_decode(input)
		if(type(input) == 'string') then
			input = toUCS4(input)
		end

		local output = {}

		-- Initialize the state
		local n = initial_n
		local i = 0
		local out = 1
		local bias = initial_bias

		local b = 1
		for j = 1, #input do
			if(input[j] == delimiter) then
				b = j
			end
		end

		for j = 1, #input do
			local c = input[j]
			if(not basic(c)) then return nil, 'Invalid input' end
		end

		for j = 1, b - 1 do
			local c = input[j]
			output[out] = toUnicode(c)
			out = out + 1
		end

		local index = 1
		if(b > 1) then
			index = b + 1
		end

		local inputLength = #input
		while(index <= inputLength) do
			local oldi = i
			local w = 1
			local k = base

			while(true) do
				if(index > inputLength) then return nil, 'Bad input' end
				local digit = decode_digit(input[index])
				if(digit >= base) then return nil, 'Bad input' end
				index = index + 1
				i = i + (digit * w)

				local t
				if(k <= bias) then
					t = tmin
				elseif(k >= bias + tmax) then
					t = tmax
				else
					t = k - bias
				end

				if(digit < t) then
					break
				end

				w = w * (base - t)

				k = k + base
			end

			bias = adapt(i - oldi, out, oldi == 0)

			n = n + math.floor(i / (out))
			i = (i % out) + 1

			table.insert(output, i, toUnicode(n))
			out = out + 1
		end

		return table.concat(output)
	end
end

local idn_encode
do
	function idn_encode(domain)
		local labels = {}
		for label in domain:gmatch('([^.]+)%.?') do
			-- Domain names can only consist of a-z, A-Z, 0-9, - and aren't allowed
			-- to start or end with a hyphen
			local first, last = label:sub(1, 1), label:sub(-1)
			if(first == '-' or last == '-') then
				return nil, 'Invalid DNS label'
			end

			if(label:match('^[a-zA-Z0-9-]+$')) then
				table.insert(labels, label)
			elseif(label:sub(1,1) ~= '-' and label:sub(2,2) ~= '-') then
				local plabel = punycode_encode(label)
				table.insert(labels, string.format('xn--%s', plabel))
			end
		end

		return table.concat(labels, '.')
	end
end

local idn_decode
do
	function idn_decode(domain)
		local labels = {}
		for label in domain:gmatch('([^.]+)%.?') do
			if(label:sub(1, 4) == 'xn--') then
				table.insert(labels, punycode_decode(label:sub(5)))
			elseif(label:match('^[a-zA-Z0-9-]+$')) then
				table.insert(labels, label)
			end
		end

		return table.concat(labels, '.')
	end
end

return {
	encode = idn_encode,
	decode = idn_decode,

	punycode = {
		encode = punycode_encode,
		decode = punycode_decode,
	},
}
