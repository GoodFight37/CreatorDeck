"""Dessine les sachets du Drop (public/packs/live-opening.svg, memes-opening.svg).

Les SVG sont servis en <img> : aucune police ne s'y charge, donc les lettres sont
tracées en vecteur depuis Barlow Condensed (OFL). Gabarit commun : 600 x 880, soudure
haute à y = 136 (15,45 %, la coupe de pack-tear), soudure basse à y = 774.

    python scripts/build-pack-art.py
"""
import math
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-%d-normal.woff2"
_fonts: dict[int, TTFont] = {}

POUCH = ("M22 10Q300 5 578 10L589 35L581 78L566 139C577 322 584 563 567 766"
         "L584 835L573 869Q300 877 27 869L16 835L33 766C16 563 23 322 34 139L19 78L11 35Z")


def text(s: str, size: float, x: float = 0, y: float = 0, anchor: str = "middle",
         track: float = 0, weight: int = 900) -> tuple[str, float]:
    font = _fonts.setdefault(weight, TTFont(str(FONT) % weight))
    cmap, glyphs, hmtx = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
    k = size / font["head"].unitsPerEm
    width = sum(hmtx[cmap[ord(c)]][0] * k + track for c in s) - track
    cursor = x - (width / 2 if anchor == "middle" else width if anchor == "end" else 0)
    d = ""
    for c in s:
        name = cmap[ord(c)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (k, 0, 0, -k, cursor, y)))
        d += pen.getCommands()
        cursor += hmtx[name][0] * k + track
    return d, width


def star(cx, cy, r, inner=.28):
    pts = []
    for i in range(8):
        a = i * math.pi / 4 - math.pi / 2
        rr = r if i % 2 == 0 else r * inner
        pts.append(f"{cx + rr * math.cos(a):.1f} {cy + rr * math.sin(a):.1f}")
    return "M" + "L".join(pts) + "Z"


def burst(r, spikes=14, inner=.82):
    pts = []
    for i in range(spikes * 2):
        a = i * math.pi / spikes
        rr = r if i % 2 == 0 else r * inner
        pts.append(f"{rr * math.cos(a):.1f} {rr * math.sin(a):.1f}")
    return "M" + "L".join(pts) + "Z"


def ridges(y0, y1, light, dark):
    out = []
    for x in range(30, 575, 9):
        out.append(f'<path d="M{x} {y0}V{y1}" stroke="{light}" stroke-opacity=".3" stroke-width="3"/>')
        out.append(f'<path d="M{x + 4.5} {y0}V{y1}" stroke="{dark}" stroke-opacity=".38" stroke-width="4"/>')
    return "".join(out)


def lettering(label, size, y, skew, fill, edge, extrude, edge_w=16, drop=9, track=0, rot=0):
    d, _ = text(label, size, 300, y, track=track)
    return (f'<g transform="rotate({rot} 300 {y}) translate(300 {y}) skewX({skew}) translate(-300 {-y})" stroke-linejoin="round">'
            f'<path d="{d}" transform="translate(0 {drop})" fill="{extrude}" stroke="{edge}" stroke-width="{edge_w}"/>'
            f'<path d="{d}" fill="{edge}" stroke="{edge}" stroke-width="{edge_w}"/>'
            f'<path d="{d}" fill="{fill}"/></g>')


def sparkles(items, fill):
    return "".join(f'<path d="{star(x, y, r)}" fill="{fill}" opacity="{o}"/>' for x, y, r, o in items)


def pouch(body, crimp, ids, rim, label_bg, label_ink, crimp_light, crimp_dark, title_attr,
          top_label="DÉCHIRE LE SACHET", bottom_label="5 CARTES · ÉDITION 01"):
    """Le sachet, ses soudures et ses deux étiquettes.

    Tout ce que le joueur lit est en français : le sachet est un objet du jeu,
    pas une illustration d'importation. Seuls les noms d'univers (« LIVE DROP »,
    « MEMES », « IMGFLIP ») et la marque restent tels quels.
    """
    # La flèche n'est pas dans le sous-ensemble latin de la police : elle est dessinée.
    top, w = text(top_label, 31, 270, 85, weight=800, track=1.5)
    ax = 270 + w / 2 + 18
    bottom, _ = text(bottom_label, 31, 300, 826, weight=800, track=1.5)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="880" viewBox="0 0 600 880">
<title>{title_attr}</title>
<defs>
 <clipPath id="pouch"><path d="{POUCH}"/></clipPath>
 <linearGradient id="crimp" x1="0" y1="0" x2="0" y2="1">{crimp}</linearGradient>
 <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="0">
  <stop stop-color="#000" stop-opacity=".34"/><stop offset=".09" stop-color="#fff" stop-opacity=".22"/>
  <stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/>
  <stop offset=".86" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".38"/>
 </linearGradient>
 <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
  <stop stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
 </linearGradient>
 {ids}
</defs>
<g clip-path="url(#pouch)">
 {body}
 <path d="M0 0H600V136H0Z M0 774H600V880H0Z" fill="url(#crimp)"/>
 <g fill="none">{ridges(14, 120, crimp_light, crimp_dark)}{ridges(790, 866, crimp_light, crimp_dark)}</g>
 <path d="M0 136H600 M0 774H600" stroke="#000" stroke-opacity=".5" stroke-width="9"/>
 <path d="M0 131H600 M0 779H600" stroke="#fff" stroke-opacity=".75" stroke-width="3"/>
 <path d="M0 0H600V880H0Z" fill="url(#gloss)"/>
 <path d="M-40 340L330 -30H470L-40 480Z M150 880L640 380V560L330 880Z" fill="url(#sheen)"/>
 <rect x="119" y="50" width="362" height="50" rx="25" fill="{label_bg}"/>
 <path d="{top}" fill="{label_ink}"/><path d="M{ax} 75H{ax + 30}M{ax + 20} 66L{ax + 30} 75L{ax + 20} 84" fill="none" stroke="{label_ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
 <rect x="129" y="797" width="342" height="46" rx="23" fill="{label_bg}"/>
 <path d="{bottom}" fill="{label_ink}"/>
</g>
<path d="{POUCH}" fill="none" stroke="{rim}" stroke-width="5"/>
<path d="{POUCH}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.5" transform="translate(0 1)"/>
</svg>
'''


def live():
    ids = '''
 <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8a5cff"/><stop offset=".5" stop-color="#4a28d8"/><stop offset="1" stop-color="#1c0f5e"/></linearGradient>
 <radialGradient id="glow" cx=".5" cy=".42" r=".6"><stop stop-color="#ff7ac8" stop-opacity=".55"/><stop offset="1" stop-color="#ff7ac8" stop-opacity="0"/></radialGradient>
 <linearGradient id="cam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff7ab8"/><stop offset="1" stop-color="#ffb86b"/></linearGradient>
 <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#ffd3ea"/></linearGradient>
 <clipPath id="camWin"><rect x="-166" y="-131" width="332" height="262" rx="16"/></clipPath>'''
    rays = "".join(f'<path d="M300 400L{300 + 700 * math.cos(a):.0f} {400 + 700 * math.sin(a):.0f}L{300 + 700 * math.cos(a + .13):.0f} {400 + 700 * math.sin(a + .13):.0f}Z"/>'
                   for a in [i * math.pi / 8 for i in range(16)])
    bokeh = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="{o}"/>'
                    for x, y, r, o in [(-120, -70, 22, .22), (-60, -100, 12, .3), (110, -90, 26, .2), (130, 20, 14, .26), (-140, 30, 16, .22), (70, -40, 9, .3)])
    brackets = "".join(f'<path d="M{sx * 150} {sy * 100}V{sy * 118}M{sx * 150} {sy * 118}H{sx * 132}" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".9"/>'
                       for sx in (-1, 1) for sy in (-1, 1))
    live_t, _ = text("EN DIRECT", 27, 40, 29, anchor="start")
    views_t, _ = text("12,4 K", 29, 40, 29, anchor="start")
    follow_t, _ = text("+1 ABONNÉ", 27, 62, 31, anchor="start", weight=800)
    brand_t, _ = text("CREATORDECK", 30, 300, 190, track=7, weight=800)
    tag_t, _ = text("COLLECTION CRÉATEURS", 25, 300, 715, track=3, weight=800)
    body = f'''
 <path d="M0 0H600V880H0Z" fill="url(#bg)"/>
 <g fill="#fff" opacity=".07">{rays}</g>
 <path d="M0 0H600V880H0Z" fill="url(#glow)"/>
 {sparkles([(78, 215, 14, .9), (535, 245, 18, .95), (62, 520, 9, .7), (545, 560, 12, .8), (92, 700, 11, .75), (515, 690, 8, .7), (300, 232, 6, .6)], "#fff")}
 <g fill="#ff7ac8" opacity=".9"><rect x="520" y="185" width="14" height="14" rx="3" transform="rotate(20 527 192)"/><rect x="66" y="600" width="12" height="12" rx="3" transform="rotate(-18 72 606)"/><circle cx="548" cy="640" r="7"/><circle cx="58" cy="318" r="7"/></g>
 <path d="{brand_t}" fill="#fff" opacity=".92"/>
 <g transform="translate(300 376) rotate(-3)">
  <rect x="-180" y="-142" width="360" height="296" rx="28" fill="#0b0430" opacity=".5" transform="translate(9 14)"/>
  <rect x="-180" y="-145" width="360" height="290" rx="28" fill="#fff4e6"/>
  <g clip-path="url(#camWin)">
   <rect x="-170" y="-135" width="340" height="270" fill="url(#cam)"/>
   {bokeh}
   <path d="M-130 140C-128 74 -76 54 0 54C76 54 128 74 130 140Z" fill="#2a1a8e"/>
   <path d="M-34 54L-20 92M34 54L20 92" stroke="#fff4e6" stroke-width="5" stroke-linecap="round"/>
   <rect x="-17" y="20" width="34" height="42" rx="10" fill="#e9a67d"/>
   <ellipse cx="0" cy="-22" rx="53" ry="60" fill="#f7c3a0"/>
   <path d="M-56 -26C-64 -102 64 -102 56 -26C42 -62 -42 -62 -56 -26Z" fill="#1b0f5e"/>
   <path d="M-64 -20C-72 -112 72 -112 64 -20" fill="none" stroke="#fff4e6" stroke-width="12" stroke-linecap="round"/>
   <rect x="-80" y="-34" width="28" height="54" rx="13" fill="#ff4fa3"/><rect x="-74" y="-28" width="7" height="40" rx="3.5" fill="#fff" opacity=".45"/>
   <rect x="52" y="-34" width="28" height="54" rx="13" fill="#ff4fa3"/><rect x="58" y="-28" width="7" height="40" rx="3.5" fill="#fff" opacity=".45"/>
   <path d="M-76 14C-96 52 -72 76 -36 52" fill="none" stroke="#fff4e6" stroke-width="5" stroke-linecap="round"/>
   <circle cx="-33" cy="52" r="10" fill="#1b0f5e" stroke="#fff4e6" stroke-width="3"/>
   <ellipse cx="-20" cy="-12" rx="6.5" ry="8" fill="#1b0f5e"/><ellipse cx="20" cy="-12" rx="6.5" ry="8" fill="#1b0f5e"/>
   <circle cx="-18" cy="-15" r="2.4" fill="#fff"/><circle cx="22" cy="-15" r="2.4" fill="#fff"/>
   <circle cx="-34" cy="8" r="9" fill="#ff7a9c" opacity=".55"/><circle cx="34" cy="8" r="9" fill="#ff7a9c" opacity=".55"/>
   <path d="M-17 13Q0 32 17 13" fill="#8a2a45" stroke="#8a2a45" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
   {brackets}
   <g transform="translate(-150 -114)"><rect width="148" height="42" rx="21" fill="#ff2d4a"/><circle cx="22" cy="21" r="8" fill="#fff"/><path d="{live_t}" fill="#fff" transform="translate(0 6)"/></g>
   <g transform="translate(26 -114)"><rect width="134" height="42" rx="21" fill="#0b0430" opacity=".78"/>
    <path d="M18 21Q30 8 42 21Q30 34 18 21Z" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="30" cy="21" r="4.5" fill="#fff"/>
    <path d="{views_t}" fill="#fff" transform="translate(14 6)"/></g>
  </g>
  <rect x="-180" y="-145" width="360" height="290" rx="28" fill="none" stroke="#fff" stroke-width="4"/>
  <g transform="translate(-216 70) rotate(-7)"><rect width="198" height="48" rx="24" fill="#fff4e6" stroke="#1b0f5e" stroke-width="4"/>
   <path d="M30 14C30 8 22 8 22 15C22 21 30 27 30 31C30 27 38 21 38 15C38 8 30 8 30 14Z" fill="#ff4fa3" transform="translate(-2 3)"/>
   <path d="{follow_t}" fill="#1b0f5e" transform="translate(12 1)"/></g>
  <g transform="translate(120 40) rotate(5)"><rect width="104" height="64" rx="18" fill="#1b0f5e" stroke="#fff4e6" stroke-width="4"/>
   <path d="M22 64L14 84L42 64Z" fill="#1b0f5e" stroke="#fff4e6" stroke-width="4" stroke-linejoin="round"/>
   <circle cx="26" cy="24" r="9" fill="#7ee0ff"/><rect x="42" y="18" width="46" height="9" rx="4.5" fill="#fff4e6"/>
   <rect x="20" y="40" width="64" height="9" rx="4.5" fill="#8a7bff"/></g>
 </g>
 {lettering("LIVE DROP", 106, 644, -9, "url(#ink)", "#150a4d", "#ff4fa3", edge_w=18, drop=9, track=1)}
 <path d="{tag_t}" fill="#fff" opacity=".9"/>'''
    crimp = '<stop stop-color="#e9e0ff"/><stop offset=".5" stop-color="#a893f2"/><stop offset="1" stop-color="#6a4fd0"/>'
    return pouch(body, crimp, ids, "#fff", "#150a4d", "#fff", "#fff", "#2b1a82", "CreatorDeck — LIVE DROP pack")


def memes():
    ids = '''
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9ff3a"/><stop offset=".55" stop-color="#7cee74"/><stop offset="1" stop-color="#2fd3a0"/></linearGradient>
 <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="11" cy="11" r="4.2" fill="#0a5a3a"/></pattern>
 <linearGradient id="dotFade" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <mask id="dotMask"><rect width="600" height="880" fill="url(#dotFade)"/></mask>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#62d6ff"/><stop offset="1" stop-color="#3a6cff"/></linearGradient>
 <radialGradient id="face" cx=".4" cy=".32" r=".8"><stop stop-color="#ffa6dc"/><stop offset="1" stop-color="#ff5db4"/></radialGradient>
 <clipPath id="img"><rect x="-176" y="-136" width="352" height="272" rx="6"/></clipPath>'''
    lens = "M-92 -26H-8V-2H-22V10H-38V22H-62V10H-78V-2H-92Z"
    top_t, _ = text("QUAND TU TIRES", 36, 0, -98, weight=900)
    bot_t, _ = text("UNE LÉGENDAIRE", 34, 0, 118, weight=900)
    x5, _ = text("×5", 54, 0, 12)
    cartes, _ = text("CARTES", 21, 0, 38, weight=800)
    lol, _ = text("LOL", 40, 0, 0)
    tag_t, _ = text("COLLECTION DE MÈMES", 27, 300, 716, track=3, weight=800)
    body = f'''
 <path d="M0 0H600V880H0Z" fill="url(#bg)"/>
 <rect width="600" height="880" fill="url(#dots)" opacity=".34" mask="url(#dotMask)"/>
 {sparkles([(66, 230, 16, 1), (540, 600, 14, 1), (78, 668, 10, .9), (528, 210, 9, .9)], "#fff")}
 <g transform="translate(300 352) rotate(2.5)" stroke-linejoin="round">
  <rect x="-186" y="-142" width="372" height="292" rx="10" fill="#0b0b0b" transform="translate(10 12)"/>
  <rect x="-186" y="-142" width="372" height="292" rx="10" fill="#fff" stroke="#0b0b0b" stroke-width="7"/>
  <g clip-path="url(#img)">
   <rect x="-176" y="-136" width="352" height="272" fill="url(#sky)"/>
   <path d="M-176 70Q-90 30 0 60T176 40V140H-176Z" fill="#1d4fe0" opacity=".55"/>
   <g fill="#fff" opacity=".92"><ellipse cx="-120" cy="-40" rx="40" ry="14"/><ellipse cx="-96" cy="-52" rx="26" ry="14"/><ellipse cx="128" cy="-20" rx="34" ry="12"/><ellipse cx="146" cy="-31" rx="20" ry="11"/></g>
   <g transform="translate(0 0) scale(.8)">
   <circle cx="0" cy="20" r="104" fill="url(#face)" stroke="#0b0b0b" stroke-width="7"/>
   <path d="M-78 -40Q-30 -88 40 -72" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>
   <circle cx="-66" cy="44" r="15" fill="#ff3e9a" opacity=".6"/><circle cx="66" cy="44" r="15" fill="#ff3e9a" opacity=".6"/>
   <path d="{lens}" transform="translate(0 4)" fill="#0b0b0b"/><path d="{lens}" transform="translate(0 4) scale(-1 1)" fill="#0b0b0b"/>
   <rect x="-10" y="-24" width="20" height="14" fill="#0b0b0b"/>
   <rect x="-100" y="-24" width="12" height="12" fill="#0b0b0b"/><rect x="88" y="-24" width="12" height="12" fill="#0b0b0b"/>
   <g fill="#fff"><rect x="-82" y="-18" width="22" height="9"/><rect x="-82" y="-5" width="9" height="9"/><rect x="14" y="-18" width="22" height="9"/><rect x="14" y="-5" width="9" height="9"/></g>
   <path d="M-52 52Q0 112 52 52Z" fill="#fff" stroke="#0b0b0b" stroke-width="6"/>
   <path d="M-26 62V80M0 66V86M26 62V80" stroke="#0b0b0b" stroke-width="3.5" stroke-linecap="round"/>
   </g>
   <g transform="translate(0 20)" paint-order="stroke" stroke="#0b0b0b" stroke-width="9" fill="#fff">
    <path d="{top_t}"/><path d="{bot_t}"/></g>
  </g>
  <g transform="translate(198 -116) rotate(14)"><path d="{burst(52)}" fill="#fff" stroke="#0b0b0b" stroke-width="6"/>
   <path d="{x5}" fill="#0b0b0b" transform="translate(0 -4)"/><path d="{cartes}" fill="#ff2e93" transform="translate(0 -2)"/></g>
  <g transform="translate(-196 -142) rotate(-10)"><rect x="-4" y="-34" width="104" height="58" rx="16" fill="#fff" stroke="#0b0b0b" stroke-width="6"/>
   <path d="M22 24L10 46L44 24Z" fill="#fff" stroke="#0b0b0b" stroke-width="6"/><rect x="14" y="21" width="30" height="8" fill="#fff"/>
   <path d="{lol}" fill="#0b0b0b" transform="translate(48 -3)"/></g>
  <g transform="translate(104 -4) rotate(-6) scale(.85)"><path d="M0 0L0 74L19 57L32 88L48 81L35 51L62 51Z" fill="#fff" stroke="#0b0b0b" stroke-width="6"/>
   <g fill="none" stroke="#ff2e93" stroke-width="5" stroke-linecap="round"><path d="M-14 -4L-26 -14M-6 -16L-8 -30M12 -14L20 -26"/></g></g>
 </g>
 {lettering("MEMES", 168, 640, -7, "#ffffff", "#0b0b0b", "#ff2e93", edge_w=20, drop=11, track=2, rot=-2)}
 <rect x="124" y="686" width="352" height="46" rx="23" fill="#0b0b0b"/>
 <path d="{tag_t}" fill="#d9ff3a"/>'''
    crimp = '<stop stop-color="#ffd0ee"/><stop offset=".5" stop-color="#ff6cbc"/><stop offset="1" stop-color="#d1308a"/>'
    return pouch(body, crimp, ids, "#0b0b0b", "#0b0b0b", "#d9ff3a", "#fff", "#7a0f4a", "CreatorDeck — sachet MEMES")


def imgflip():
    ids = '''<linearGradient id="bg" x2="1" y2="1"><stop stop-color="#123366"/><stop offset="1" stop-color="#07b7c9"/></linearGradient>'''
    tag, _ = text("CLASSIQUES DU NET", 30, 300, 710, track=2)
    cards, _ = text("5 CARTES MÈMES", 31, 300, 536, track=2)
    body = f'''<rect width="600" height="880" fill="url(#bg)"/>
    {sparkles([(72, 210, 18, 1), (514, 260, 16, 1), (76, 650, 11, .8)], "#81ffdd")}
    <g transform="translate(300 350) rotate(-9)" stroke="#09234b" stroke-width="8" stroke-linejoin="round">
      <rect x="-153" y="-115" width="330" height="250" rx="18" fill="#ffce56" transform="rotate(15)"/>
      <rect x="-175" y="-130" width="350" height="260" rx="18" fill="#f2ffff"/>
      <path d="M-145 -80H145M-145 85H145" stroke-width="17"/>
      <circle r="68" fill="#81ffdd"/>
      <path d="M-47 -18H-9V5H-47ZM9 -18H47V5H9ZM-9 -12H9" fill="#09234b"/>
      <path d="M-32 30Q0 62 32 30" fill="none" stroke-linecap="round"/>
    </g>
    <path d="{cards}" fill="#fff"/>
    {lettering("IMGFLIP", 138, 651, -7, "#fff", "#09234b", "#ffce56", edge_w=16)}
    <path d="{tag}" fill="#81ffdd"/>'''
    crimp = '<stop stop-color="#a8fff2"/><stop offset=".5" stop-color="#14bdc8"/><stop offset="1" stop-color="#086290"/>'
    return pouch(body, crimp, ids, "#fff", "#09234b", "#fff", "#fff", "#073a68", "CreatorDeck — IMGFLIP pack")


if __name__ == "__main__":
    out = ROOT / "public/packs"
    (out / "live-opening.svg").write_text(live(), encoding="utf-8")
    (out / "memes-opening.svg").write_text(memes(), encoding="utf-8")
    (out / "imgflip-opening.svg").write_text(imgflip(), encoding="utf-8")
    print("ok")
