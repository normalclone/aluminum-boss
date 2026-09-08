# Prepares the concept photograph for use as the hero backdrop.
#
# The source is the image embedded in the concept PDF: a 1600x760 interior showing the window
# and door systems. It is cropped to the frame the concept itself uses and re-encoded. The
# picture is not retouched.
#
#   1. Sides. The concept crops 124px from each side, which takes the standard lamp out of the
#      frame - the lamp sits exactly where the six product names go. This crop keeps that, then
#      shifts the window a further 124px right, to the original's right edge, so the BossGroup
#      logo on the wall is whole rather than cut in half. The hero is anchored right, so the
#      logo is the part that survives when the viewport crops the photograph further.
#   2. Top. The strip carrying "Thuong hieu thuoc BossGroup" goes: it would land under the
#      header and collide with the claim, and the wordmark already says it. In the concept it is
#      masked with a pale rectangle instead; cropping is tidier. The BossGroup logo on the wall
#      stays - that is part of the room, not an overlay.
#   3. Re-encoded as JPEG. The PNG is 973 KB for a photograph, which is the wrong container.
import io, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'site'))
OUT = os.path.join(ROOT, '_media')

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'concept-img0.png')
CROP_TOP = 104                  # the caption sits between y=45 and y=85
CROP_L, CROP_R = 248, 1600      # shifted right of the concept's frame, see note 1

im = Image.open(SRC).convert('RGB')
w, h = im.size
im = im.crop((CROP_L, CROP_TOP, CROP_R, h))

if not os.path.isdir(OUT):
    os.makedirs(OUT)

dst = os.path.join(OUT, 'hero-profile.jpg')
im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)

print('nguon    %dx%d, %.0f KB' % (w, h, os.path.getsize(SRC) / 1024))
print('cat tren %dpx, hai ben %d/%d -> %dx%d (ti le %.3f)'
      % (CROP_TOP, CROP_L, w - CROP_R, im.size[0], im.size[1], im.size[0]/im.size[1]))
print('ket qua  %s, %.0f KB' % (os.path.relpath(dst, ROOT).replace(os.sep, '/'),
                                os.path.getsize(dst) / 1024))
