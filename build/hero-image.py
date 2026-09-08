# Prepares the concept photograph for use as the hero backdrop.
#
# The source is the image embedded in the concept PDF: a 1600x760 interior showing the window
# and door systems. Two things are done to it and nothing else - the picture itself is not
# retouched.
#
#   1. The top strip carrying "Thuong hieu thuoc BossGroup" is cropped away. It would land
#      directly under the header and collide with the claim, and the wordmark already says it.
#      The BossGroup logo on the wall stays: it is part of the room, not an overlay.
#   2. Re-encoded as JPEG. The PNG is 973 KB for a photograph, which is the wrong container.
import io, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
OUT = os.path.join(ROOT, '_media')

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'concept-img0.png')
CROP_TOP = 104          # measured: the caption sits between y=45 and y=85

im = Image.open(SRC).convert('RGB')
w, h = im.size
im = im.crop((0, CROP_TOP, w, h))

if not os.path.isdir(OUT):
    os.makedirs(OUT)

dst = os.path.join(OUT, 'hero-profile.jpg')
im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)

print('nguon    %dx%d, %.0f KB' % (w, h, os.path.getsize(SRC) / 1024))
print('cat %dpx tren -> %dx%d' % (CROP_TOP, im.size[0], im.size[1]))
print('ket qua  %s, %.0f KB' % (os.path.relpath(dst, ROOT).replace(os.sep, '/'),
                                os.path.getsize(dst) / 1024))
