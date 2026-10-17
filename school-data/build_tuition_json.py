"""Build frontend/src/data/tuition.json from the tuition columns in schools.csv.

Keyed by the county private-school id (OBJECTID), which is also the number in the directory's
`prv-<id>` ids and the `id` /address/report returns for private schools. Re-run after editing schools.csv:

    python3 school-data/build_tuition_json.py
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'school-data' / 'schools.csv'
OUT = ROOT / 'frontend' / 'src' / 'data' / 'tuition.json'

# Rows the app hides: definitely closed, not a school, or adults only. "Possibly closed" stays visible.
HIDE = re.compile(r'\bclosed\b|not a (tuition-charging )?school|mikvah|shelter|foster|adults 18\+', re.I)
UNSURE = re.compile(r'\b(may|might|possibly|appears?|likely|looks?|unverified|reportedly|confirm)\b', re.I)

rows = {}
hidden = []
for r in csv.DictReader(open(SOURCE, encoding='utf-8-sig')):
    if r['type'] != 'Private':
        continue
    row = {
        'name': r['name'],
        'low': int(r['tuition_low']),
        'high': int(r['tuition_high']),
        # charter schools the county lists as private are free
        'source': 'free' if r['tuition_source'] == 'charter_free' else r['tuition_source'],
    }
    if r['tuition_year']:
        row['year'] = r['tuition_year']
    if r['tuition_url']:
        row['url'] = r['tuition_url']
    flag = r['data_flag']
    if flag and HIDE.search(flag) and not UNSURE.search(flag):
        row['hidden'] = True
        hidden.append(r['name'])
    rows[r['source_id']] = row

OUT.write_text(json.dumps(rows, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')
print(f'wrote {len(rows)} schools to {OUT.relative_to(ROOT)}; hidden: {len(hidden)}')
