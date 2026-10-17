"""Extract the FDOE 2025–26 Miami-Dade results with Python's standard library.

    python3 school-data/build_academics_json.py [path/to/SchoolGrades26.xlsx]

Read-only XLSX extraction: district 13 + four-digit school number, worksheet
columns G (ELA achievement), J (math achievement), V (Grade 2026). Missing or
suppressed values remain null. No name similarity or shared-campus joins.
"""
import argparse
import csv
import hashlib
import json
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'frontend/src/data/academics.json'
SOURCE_URL = 'https://www.fldoe.org/file/18534/SchoolGrades26.xlsx'
METHOD_URL = 'https://www.fldoe.org/file/18534/SchoolGradesCalcGuide26.pdf'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
BLANK_IDS = {
    '179': '0422', '178': '2032', '180': '5219',
    '185': '5555', '184': '5556',
}


def exact_name(value):
    # Case/spacing only. Punctuation and campus/division words remain significant.
    return ' '.join(value.strip().lower().split())


def percentage(value):
    if value is None or not re.fullmatch(r'\d+(?:\.\d+)?', value.strip()):
        return None
    result = float(value)
    if not 0 <= result <= 100:
        raise ValueError(f'Out-of-range achievement percentage: {value!r}')
    return int(result) if result.is_integer() else result


def worksheet_rows(path):
    with zipfile.ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        sheet = next(s for s in workbook.findall('s:sheets/s:sheet', NS)
                     if s.attrib['name'] == 'School Grades 2026')
        relations = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        target = next(r.attrib['Target'] for r in relations
                      if r.attrib['Id'] == sheet.attrib[f'{{{REL_NS}}}id'])
        sheet_path = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS):
                strings.append(''.join(t.text or '' for t in item.findall('.//s:t', NS)))
        rows = []
        for row in ET.fromstring(archive.read(sheet_path)).findall('s:sheetData/s:row', NS):
            values = {}
            for cell in row.findall('s:c', NS):
                if cell.find('s:f', NS) is not None:
                    # No formulas exist in the source columns. Refuse stale caches if that changes.
                    if re.sub(r'\d+$', '', cell.attrib['r']) in {'A', 'C', 'E', 'G', 'J', 'V'}:
                        raise ValueError(f'Formula in source cell {cell.attrib["r"]}')
                raw = cell.find('s:v', NS)
                value = raw.text if raw is not None else None
                if cell.attrib.get('t') == 's' and value is not None:
                    value = strings[int(value)]
                elif cell.attrib.get('t') == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.findall('.//s:t', NS))
                values[re.sub(r'\d+$', '', cell.attrib['r'])] = value
            rows.append((int(row.attrib['r']), values))
        return rows


def build(path):
    rows = worksheet_rows(path)
    header = next(value for number, value in rows if number == 4)
    expected = {'A': 'District Number', 'C': 'School Number', 'E': 'School Name',
                'G': 'English Language Arts Achievement', 'J': 'Mathematics Achievement', 'V': 'Grade 2026'}
    for column, label in expected.items():
        if header.get(column) != label:
            raise ValueError(f'Unexpected {column}4 header: {header.get(column)!r}')
    title = next(value.get('C') for number, value in rows if number == 1)
    if not title or not title.startswith('2025-26 School Grades'):
        raise ValueError(f'Unexpected workbook period: {title!r}')
    schools, source_rows = {}, {}
    for row_number, value in rows:
        if (value.get('A') or '').strip() != '13':
            continue
        school_id = (value.get('C') or '').strip().zfill(4)
        if not re.fullmatch(r'\d{4}', school_id) or school_id == '0000':
            raise ValueError(f'Invalid school number at row {row_number}')
        if school_id in schools:
            raise ValueError(f'Duplicate district 13 school {school_id}')
        grade = (value.get('V') or '').strip()
        schools[school_id] = {'schoolNumber': school_id, 'name': value['E'],
                              'schoolGrade': grade if grade in {'A', 'B', 'C', 'D', 'F'} else None,
                              'math': percentage(value.get('J')), 'english': percentage(value.get('G'))}
        source_rows[school_id] = {'row': row_number, 'englishRaw': value.get('G'),
                                  'mathRaw': value.get('J'), 'schoolGradeRaw': value.get('V')}
    if len(schools) != 473:
        raise ValueError(f'Expected 473 Miami-Dade rows, found {len(schools)}')

    # Five exact, sourced blank-ID campus repairs and one documented consolidation.
    research = json.loads((ROOT / 'school-data/missing-school-reconciliation.json').read_text())
    by_school = {r['schoolNumber']: r for r in research['records']}
    aliases, alias_evidence = {}, []
    with (ROOT / 'school-data/charter_schools.csv').open(encoding='utf-8-sig') as source:
        for record in csv.DictReader(source):
            school_id = BLANK_IDS.get(record['OBJECTID'])
            if not school_id:
                continue
            evidence = by_school[school_id]
            if record['ID'].strip() or evidence['recommendedIdentityAction'] != 'complete_existing_blank_school_number':
                raise ValueError('Verified blank-ID crosswalk no longer matches its inputs')
            # Explicit pairs, not a name-based search through the grades table.
            aliases[exact_name(record['NAME'])] = school_id
            alias_evidence.append({'name': record['NAME'].strip(), 'schoolNumber': school_id,
                                   'countyObjectId': record['OBJECTID'], 'countyRawId': record['ID'],
                                   'countyGlobalId': record['GlobalID'], 'schoolKey': evidence['schoolKey']})
    if len(aliases) != 5 or by_school['6034']['recommendedIdentityAction'] != 'reconcile_documented_consolidation':
        raise ValueError('Reconciliation evidence changed; review the explicit crosswalk')
    return {'source': {'year': '2025–26', 'districtNumber': '13', 'title': title,
                       'url': SOURCE_URL, 'methodUrl': METHOD_URL, 'worksheet': 'School Grades 2026',
                       'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'headers': expected,
                       'schoolCount': len(schools),
                       'nullMeaning': 'Missing, suppressed or not reported; never imputed as zero.'},
            'schools': schools, 'sourceRows': source_rows, 'verifiedNameAliases': aliases,
            'schoolNumberAliases': {'4002': '6034'},
            'crosswalkEvidence': {'file': 'school-data/missing-school-reconciliation.json',
                                 'blankCountyIds': alias_evidence,
                                 'schoolNumberAliases': [{'from': '4002', 'to': '6034',
                                    'sourceUrl': 'https://pdfs.dadeschools.net/Bdarch/2023/bd051723/lastbda.pdf',
                                    'locator': 'PDF page 5, Beacon elementary 4002/middle 6034 consolidation into K-8, approved May 17, 2023'}]}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', nargs='?', type=Path, default=ROOT / 'SchoolGrades26.xlsx')
    result = build(parser.parse_args().workbook)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(result["schools"])} district 13 schools to {OUT.relative_to(ROOT)}')
