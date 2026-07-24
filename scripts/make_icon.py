import zlib, struct, sys

SRC = sys.argv[1]
OUT = sys.argv[2]

# ---------- decode source RGBA PNG (8-bit, color type 6, non-interlaced) ----------
with open(SRC, "rb") as f:
    data = f.read()
assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"

pos = 8
width = height = bitdepth = colortype = None
idat = bytearray()
while pos < len(data):
    (clen,) = struct.unpack(">I", data[pos:pos+4])
    ctype = data[pos+4:pos+8]
    cdata = data[pos+8:pos+8+clen]
    if ctype == b"IHDR":
        width, height, bitdepth, colortype, comp, filt, interlace = struct.unpack(">IIBBBBB", cdata)
    elif ctype == b"IDAT":
        idat += cdata
    elif ctype == b"IEND":
        break
    pos += 12 + clen

assert bitdepth == 8 and colortype == 6, "expected 8-bit RGBA"
raw = zlib.decompress(bytes(idat))
bpp = 4
stride = width * bpp

def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc: return a
    if pb <= pc: return b
    return c

# defilter scanlines -> flat bytearray of RGBA
recon = bytearray(stride * height)
prev = bytearray(stride)
p = 0
for y in range(height):
    ftype = raw[p]; p += 1
    line = bytearray(raw[p:p+stride]); p += stride
    for x in range(stride):
        a = line[x - bpp] if x >= bpp else 0
        b = prev[x]
        c = prev[x - bpp] if x >= bpp else 0
        if ftype == 0:   v = line[x]
        elif ftype == 1: v = (line[x] + a) & 0xff
        elif ftype == 2: v = (line[x] + b) & 0xff
        elif ftype == 3: v = (line[x] + ((a + b) >> 1)) & 0xff
        elif ftype == 4: v = (line[x] + paeth(a, b, c)) & 0xff
        else: raise ValueError("bad filter")
        line[x] = v
    recon[y*stride:(y+1)*stride] = line
    prev = line

def src_px(sx, sy):
    o = sy*stride + sx*bpp
    return recon[o], recon[o+1], recon[o+2], recon[o+3]

def src_bilinear(fx, fy):
    x0 = int(fx); y0 = int(fy)
    x1 = min(x0+1, width-1); y1 = min(y0+1, height-1)
    dx = fx - x0; dy = fy - y0
    p00 = src_px(x0, y0); p10 = src_px(x1, y0)
    p01 = src_px(x0, y1); p11 = src_px(x1, y1)
    out = []
    for i in range(4):
        top = p00[i]*(1-dx) + p10[i]*dx
        bot = p01[i]*(1-dx) + p11[i]*dx
        out.append(top*(1-dy) + bot*dy)
    return out

# ---------- compose onto brand gradient ----------
W = H = 1024
C0 = (37, 99, 235)   # #2563EB
C1 = (29, 63, 170)   # #1D3FAA

TARGET = 660                    # footprint of the hands artwork on the icon
OX = (W - TARGET) // 2          # centered horizontally
OY = int(H * 0.50) - TARGET // 2  # centered, nudged for optical balance
scale = width / TARGET          # source px per target px

rows = []
for y in range(H):
    row = bytearray([0])  # filter byte 0
    t_row = (y) / (W + H)
    for x in range(W):
        t = (x + y) / (W + H)
        br = C0[0] + (C1[0]-C0[0])*t
        bg = C0[1] + (C1[1]-C0[1])*t
        bb = C0[2] + (C1[2]-C0[2])*t
        if OX <= x < OX+TARGET and OY <= y < OY+TARGET:
            fx = (x - OX) * scale
            fy = (y - OY) * scale
            r, g, b, a = src_bilinear(fx, fy)
            af = a / 255.0
            br = r*af + br*(1-af)
            bg = g*af + bg*(1-af)
            bb = b*af + bb*(1-af)
        row.append(int(br+0.5)); row.append(int(bg+0.5)); row.append(int(bb+0.5))
    rows.append(bytes(row))

def chunk(typ, d):
    c = typ + d
    return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

sig = b"\x89PNG\r\n\x1a\n"
ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")
with open(OUT, "wb") as f:
    f.write(png)
print("wrote", OUT, len(png), "bytes; hands footprint", TARGET, "at", (OX, OY))
