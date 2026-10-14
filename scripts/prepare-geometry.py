import json
from pathlib import Path
source = json.loads(Path('work/states-albers-10m.json').read_text())
codes = dict(item.split(':') for item in '01:AL 02:AK 04:AZ 05:AR 06:CA 08:CO 09:CT 10:DE 11:DC 12:FL 13:GA 15:HI 16:ID 17:IL 18:IN 19:IA 20:KS 21:KY 22:LA 23:ME 24:MD 25:MA 26:MI 27:MN 28:MS 29:MO 30:MT 31:NE 32:NV 33:NH 34:NJ 35:NM 36:NY 37:NC 38:ND 39:OH 40:OK 41:OR 42:PA 44:RI 45:SC 46:SD 47:TN 48:TX 49:UT 50:VT 51:VA 53:WA 54:WV 55:WI 56:WY'.split())
transform = source['transform']
def arc(index):
    x = y = 0
    points = []
    for dx, dy in source['arcs'][index if index >= 0 else ~index]:
        x += dx; y += dy
        points.append((x * transform['scale'][0] + transform['translate'][0], y * transform['scale'][1] + transform['translate'][1]))
    return points if index >= 0 else points[::-1]
def ring(indices):
    points = []
    for index in indices:
        part = arc(index)
        points.extend(part if not points else part[1:])
    return 'M' + 'L'.join(f'{x:.2f},{y:.2f}' for x,y in points) + 'Z'
states = []
for geo in source['objects']['states']['geometries']:
    code = codes.get(str(geo['id']).zfill(2))
    if not code: continue
    polygons = [geo['arcs']] if geo['type'] == 'Polygon' else geo['arcs']
    states.append({'code':code, 'name':geo['properties']['name'], 'path':''.join(ring(r) for polygon in polygons for r in polygon)})
assert len(states) == 51
Path('assets/states.json').write_text(json.dumps(sorted(states,key=lambda s:s['name']),separators=(',',':')))
