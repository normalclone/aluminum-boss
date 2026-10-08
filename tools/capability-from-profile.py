# Dua noi dung "BossGroup Company Profile" (PDF) vao trang Capability - mot lan, co the chay lai.
#
#   python tools/capability-from-profile.py <about.json> [--profile <ten-tep-pdf>]
#
# Ghi `sections` (va `file` neu co --profile) vao chuong "capability" cua about.json. Chu lay tu
# trang 3 cua PDF ("Technical Capabilities and Equipment Overview"); anh la cac vung cat tu trang
# 4-10 va 15-20, ten tep capability-*.jpg, phai co san trong _media.
#
# KHONG dong vao title, lede, body hay anh cua chuong - do la chu khach da viet. Chuong da co
# `sections` thi dung lai, tru khi them --ghi-de: khach co the da sua cac muc nay trong trinh soan.
#
# Giu mot ban sao about.json.truoc-capability ben canh truoc khi ghi.
import json, sys, shutil

args = sys.argv[1:]
if not args:
    sys.exit(__doc__ if __doc__ else 'can duong dan about.json')
path = args[0]
profile = args[args.index('--profile') + 1] if '--profile' in args else None
overwrite = '--ghi-de' in args

def photos(name, n, caption):
    return [{"c": caption if n == 1 else f"{caption} ({i})", "image": f"capability-{name}-{i}.jpg"} for i in range(1, n + 1)]

SECTIONS = [
    {"heading": "Aluminum Extrusion Systems",
     "text": "A complete range of extrusion machinery and equipment, producing high-quality aluminum profiles for diverse applications.\n"
             "• 02 extrusion presses (690 tons)\n• 01 extrusion press (1,100 tons)\n• 01 extrusion press (1,460 tons)\n• 01 extrusion press (2,500 tons)",
     "photos": [{"c": "Extrusion line", "image": "capability-production-3.jpg"},
                {"c": "Profile handling table", "image": "capability-production-1.jpg"}]},
    {"heading": "Mold and Casting Systems",
     "text": "• Mold production systems for aluminum profile extrusion.\n• Aluminum alloy casting systems to produce high-grade billet materials.",
     "photos": [{"c": "Extrusion mold system", "image": "capability-extrusion-mold-1.jpg"}]},
    {"heading": "Mechanical Processing Systems",
     "text": "Advanced machining systems for precision aluminum and metal components:\n"
             "• 05 high-performance processing machines imported from Japan.\n• CNC cutting and machining lines.\n• Aluminum welding systems.\n"
             "• Mechanical processing and fabrication lines for metal and aluminum products.\n• 02 precision corner-stamping machines for aluminum frame assembly.",
     "photos": photos("door-machining", 4, "Aluminum door production and machining system")
               + [{"c": "Sheet metal bending and stamping system", "image": "capability-bending-1.jpg"}]},
    {"heading": "Heat Treatment and Surface Pre-Treatment Systems",
     "text": "• Heat treatment (hardening) systems.\n• 15 surface treatment tanks for degreasing and chemical cleaning.\n• 02 drying ovens operating at 70°C–120°C.",
     "photos": [{"c": "Aluminum aging furnace", "image": "capability-aging-furnace-1.jpg"}]},
    {"heading": "Electrostatic Powder Coating Systems",
     "text": "Vertical and horizontal automatic powder coating lines, imported from Germany and Switzerland, for superior surface finishing and long-term durability.\n"
             "• 02 fully automated coating lines from the USA.\n• 60 automatic spray guns and 02 manual spray guns.\n• 04 automated coating robots.\n"
             "• 04 furnaces with gas burners.\n• 04 automatic powder recovery silos.\n• 03 automatic painting booths.\n"
             "• 02 post-coating drying ovens (temperature range: 200°C – 250°C).",
     "photos": [{"c": "Horizontal powder coating line", "image": "capability-powder-horizontal-1.jpg"}]
               + photos("powder-vertical", 3, "Vertical powder coating line")
               + [{"c": "Powder recovery silo", "image": "capability-production-2.jpg"}]},
    {"heading": "Aluminum Anodizing Systems",
     "text": "• 02 aluminum anodizing lines that enhance corrosion resistance, hardness, and surface durability.",
     "photos": photos("anodizing", 4, "Anodizing line")},
    {"heading": "Aluminum Surface Finishing Systems",
     "text": "• 02 polishing machines for aluminum surface cleaning and finishing, providing smooth and glossy appearances.\n"
             "• Surface flattening and cleaning lines to ensure high-quality finishing before coating.",
     "photos": [{"c": "Surface polishing system", "image": "capability-polishing-1.jpg"}]},
    {"heading": "CNC Laser Cutting and Welding Systems",
     "text": "• 01 imported CNC laser cutting machine for precision processing of aluminum and metal components.\n"
             "• 01 imported aluminum laser welding line for high-strength, seamless structural joints.",
     "photos": [{"c": "Aluminum laser welding system", "image": "capability-laser-welding-1.jpg"},
                {"c": "Laser CNC machine", "image": "capability-laser-cnc-1.jpg"}]},
    {"heading": "Certificates",
     "text": "ISO 9001:2015 quality management certificate (BVQA), and approved applicator certificates from the powder coating suppliers.",
     "photos": [{"c": "ISO 9001:2015 certificate", "image": "capability-iso-9001-1.jpg"},
                {"c": "PPG approved applicator certificate", "image": "capability-ppg-1.jpg"},
                {"c": "PPG approved applicator certificate", "image": "capability-ppg-2.jpg"},
                {"c": "TIGER Drylac certificates of qualification", "image": "capability-tiger-1.jpg"},
                {"c": "Interpon D approved applicator certificate", "image": "capability-interpon-1.jpg"},
                {"c": "Powder coating certificates of approval", "image": "capability-approval-1.jpg"}]},
]

raw = open(path, encoding='utf-8').read()
doc = json.loads(raw)
cap = next((c for c in doc.get('chapters', []) if c.get('id') == 'capability'), None)
if cap is None:
    sys.exit('khong co chuong "capability" trong ' + path)
if cap.get('sections') and not overwrite:
    sys.exit('chuong capability da co sections - dung lai (them --ghi-de neu chac chan)')

shutil.copyfile(path, path + '.truoc-capability')
cap['sections'] = SECTIONS
if profile:
    cap['file'] = profile
open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
print('da ghi', len(SECTIONS), 'muc,', sum(len(s['photos']) for s in SECTIONS), 'anh' + (', file ' + profile if profile else ''), '->', path)
