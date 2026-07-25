import zlib, struct, math, re, sys

OUT = sys.argv[1]
W = H = 1024
SS = 3                      # supersampling
C0 = (37, 99, 235)          # #2563EB
C1 = (29, 63, 170)          # #1D3FAA
FOOTPRINT_W = 620.0         # target width of the art on the 1024 icon

D = ("M272 191.91c-17.6 0-32 14.4-32 32v80c0 8.84-7.16 16-16 16s-16-7.16-16-16v-76.55"
     "c0-17.39 4.72-34.47 13.69-49.39l77.75-129.59c9.09-15.16 4.19-34.81-10.97-43.91"
     "-14.45-8.67-32.72-4.3-42.3 9.21-.2.23-.62.21-.79.48l-117.26 175.9C117.56 205.9 112 224.31 112 243.29"
     "v80.23l-90.12 30.04A31.974 31.974 0 0 0 0 383.91v96c0 10.82 8.52 32 32 32 2.69 0 5.41-.34 8.06-1.03"
     "l179.19-46.62C269.16 449.99 304 403.8 304 351.91v-128c0-17.6-14.4-32-32-32z"
     "m346.12 161.73L528 323.6v-80.23c0-18.98-5.56-37.39-16.12-53.23L394.62 14.25"
     "c-.18-.27-.59-.24-.79-.48-9.58-13.51-27.85-17.88-42.3-9.21-15.16 9.09-20.06 28.75-10.97 43.91"
     "l77.75 129.59c8.97 14.92 13.69 32 13.69 49.39V304c0 8.84-7.16 16-16 16s-16-7.16-16-16v-80"
     "c0-17.6-14.4-32-32-32s-32 14.4-32 32v128c0 51.89 34.84 98.08 84.75 112.34l179.19 46.62"
     "c2.66.69 5.38 1.03 8.06 1.03 23.48 0 32-21.18 32-32v-96c0-13.77-8.81-25.99-21.88-30.35z")

TOK = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)')
toks = TOK.findall(D)

def cubic(p0, p1, p2, p3, n=24):
    out = []
    for i in range(1, n+1):
        t = i/n; mt = 1-t
        x = mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]
        out.append((x, y))
    return out

def arc(x1, y1, rx, ry, phid, large, sweep, x2, y2, n=20):
    if rx == 0 or ry == 0:
        return [(x2, y2)]
    phi = math.radians(phid); rx = abs(rx); ry = abs(ry)
    dx = (x1-x2)/2; dy = (y1-y2)/2
    cp, sp = math.cos(phi), math.sin(phi)
    x1p = cp*dx + sp*dy; y1p = -sp*dx + cp*dy
    lam = x1p*x1p/(rx*rx) + y1p*y1p/(ry*ry)
    if lam > 1:
        s = math.sqrt(lam); rx *= s; ry *= s
    sign = -1 if large == sweep else 1
    num = rx*rx*ry*ry - rx*rx*y1p*y1p - ry*ry*x1p*x1p
    den = rx*rx*y1p*y1p + ry*ry*x1p*x1p
    co = sign*math.sqrt(max(0, num/den))
    cxp = co*rx*y1p/ry; cyp = -co*ry*x1p/rx
    cx = cp*cxp - sp*cyp + (x1+x2)/2
    cy = sp*cxp + cp*cyp + (y1+y2)/2
    def ang(ux, uy, vx, vy):
        d = ux*vx + uy*vy
        l = math.sqrt((ux*ux+uy*uy)*(vx*vx+vy*vy))
        a = math.acos(max(-1, min(1, d/l)))
        return -a if ux*vy-uy*vx < 0 else a
    t1 = ang(1, 0, (x1p-cxp)/rx, (y1p-cyp)/ry)
    dt = ang((x1p-cxp)/rx, (y1p-cyp)/ry, (-x1p-cxp)/rx, (-y1p-cyp)/ry)
    if not sweep and dt > 0: dt -= 2*math.pi
    if sweep and dt < 0: dt += 2*math.pi
    out = []
    for i in range(1, n+1):
        th = t1 + dt*i/n
        out.append((cp*rx*math.cos(th) - sp*ry*math.sin(th) + cx,
                    sp*rx*math.cos(th) + cp*ry*math.sin(th) + cy))
    return out

# ---- parse path into closed subpaths (lists of points) ----
subpaths = []; cur = []
i = 0; cx = cy = sx = sy = 0.0; cmd = None; pcx = pcy = 0.0
def num():
    global i
    v = float(toks[i]); i += 1; return v
while i < len(toks):
    t = toks[i]
    if re.match(r'[A-Za-z]', t):
        cmd = t; i += 1
    rel = cmd.islower(); C = cmd.upper()
    if C == 'M':
        if cur: subpaths.append(cur)
        x = num(); y = num()
        if rel: x += cx; y += cy
        cx, cy = x, y; sx, sy = x, y; cur = [(cx, cy)]; cmd = 'l' if rel else 'L'
    elif C == 'L':
        x = num(); y = num()
        if rel: x += cx; y += cy
        cx, cy = x, y; cur.append((cx, cy))
    elif C == 'H':
        x = num();  x = cx+x if rel else x; cx = x; cur.append((cx, cy))
    elif C == 'V':
        y = num();  y = cy+y if rel else y; cy = y; cur.append((cx, cy))
    elif C == 'C':
        x1 = num(); y1 = num(); x2 = num(); y2 = num(); x = num(); y = num()
        if rel: x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy
        cur += cubic((cx, cy), (x1, y1), (x2, y2), (x, y))
        pcx, pcy = x2, y2; cx, cy = x, y
    elif C == 'S':
        x2 = num(); y2 = num(); x = num(); y = num()
        if rel: x2 += cx; y2 += cy; x += cx; y += cy
        x1 = 2*cx-pcx; y1 = 2*cy-pcy
        cur += cubic((cx, cy), (x1, y1), (x2, y2), (x, y))
        pcx, pcy = x2, y2; cx, cy = x, y
    elif C == 'A':
        rx = num(); ry = num(); rot = num(); la = num(); sw = num(); x = num(); y = num()
        if rel: x += cx; y += cy
        cur += arc(cx, cy, rx, ry, rot, int(la), int(sw), x, y)
        cx, cy = x, y
    elif C == 'Z':
        cur.append((sx, sy)); subpaths.append(cur); cur = []; cx, cy = sx, sy
if cur: subpaths.append(cur)

# ---- map art (viewBox 640x512) onto icon, centered ----
s = FOOTPRINT_W / 640.0
art_w = 640*s; art_h = 512*s
ox = (W - art_w)/2; oy = (H - art_h)/2
MW = W*SS
edges = []
for sp in subpaths:
    pts = [((px*s+ox)*SS, (py*s+oy)*SS) for (px, py) in sp]
    for j in range(len(pts)-1):
        edges.append((pts[j][0], pts[j][1], pts[j+1][0], pts[j+1][1]))

# ---- scanline even-odd fill into supersampled mask (row-run counts) ----
cover = [bytearray(W) for _ in range(H)]   # 0..SS*SS coverage per icon pixel
for row in range(H*SS):
    yc = row + 0.5
    xs = []
    for (ax, ay, bx, by) in edges:
        if (ay <= yc < by) or (by <= yc < ay):
            xs.append(ax + (bx-ax)*(yc-ay)/(by-ay))
    if not xs:
        continue
    xs.sort()
    orow = row // SS
    crow = cover[orow]
    for k in range(0, len(xs)-1, 2):
        xa = xs[k]; xb = xs[k+1]
        pa = max(0, int(math.ceil(xa - 0.5)))
        pb = min(MW-1, int(math.floor(xb - 0.5)))
        for p in range(pa, pb+1):
            crow[p // SS] += 1

# ---- composite white over gradient ----
maxc = SS*SS
rows = []
for y in range(H):
    row = bytearray([0]); crow = cover[y]
    for x in range(W):
        t = (x + y)/(W + H)
        r = C0[0] + (C1[0]-C0[0])*t
        g = C0[1] + (C1[1]-C0[1])*t
        b = C0[2] + (C1[2]-C0[2])*t
        a = crow[x]/maxc
        if a:
            r = 255*a + r*(1-a); g = 255*a + g*(1-a); b = 255*a + b*(1-a)
        row.append(int(r+0.5)); row.append(int(g+0.5)); row.append(int(b+0.5))
    rows.append(bytes(row))

def chunk(typ, d):
    c = typ + d
    return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
sig = b"\x89PNG\r\n\x1a\n"
ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
open(OUT, "wb").write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))
print("wrote", OUT, "subpaths", len(subpaths), "edges", len(edges))
