import zlib, struct

W = H = 1024
SS = 3  # supersampling for antialiasing

# Brand gradient: #2563EB -> #1D3FAA (diagonal)
C0 = (37, 99, 235)
C1 = (29, 63, 170)

def heart_inside(nx, ny):
    # Implicit heart curve; ny already flipped so +y is up
    v = (nx * nx + ny * ny - 1) ** 3 - nx * nx * (ny ** 3)
    return v <= 0

def sample(px, py):
    t = (px + py) / (W + H)
    bg = (
        C0[0] + (C1[0] - C0[0]) * t,
        C0[1] + (C1[1] - C0[1]) * t,
        C0[2] + (C1[2] - C0[2]) * t,
    )
    # Heart geometry: centered horizontally, sitting slightly above middle
    nx = (px - W / 2) / (W * 0.26)
    ny = -((py - H * 0.48) / (H * 0.26))
    if heart_inside(nx, ny):
        return (255.0, 255.0, 255.0)
    return bg

rows = []
for y in range(H):
    row = bytearray()
    row.append(0)  # PNG filter type 0 for this scanline
    for x in range(W):
        r = g = b = 0.0
        for sy in range(SS):
            for sx in range(SS):
                px = x + (sx + 0.5) / SS
                py = y + (sy + 0.5) / SS
                c = sample(px, py)
                r += c[0]; g += c[1]; b += c[2]
        n = SS * SS
        row.append(int(r / n + 0.5))
        row.append(int(g / n + 0.5))
        row.append(int(b / n + 0.5))
    rows.append(bytes(row))

def chunk(typ, data):
    c = typ + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

sig = b"\x89PNG\r\n\x1a\n"
ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)  # 8-bit, truecolor RGB
idat = zlib.compress(b"".join(rows), 9)
png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

import sys
out = sys.argv[1]
with open(out, "wb") as f:
    f.write(png)
print("wrote", out, len(png), "bytes")
