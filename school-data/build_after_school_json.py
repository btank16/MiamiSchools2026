"""Import only school-linked research records. Run from any working directory."""
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
research = project.parent / 'docs/research/after-school-data-2026-10-17'
source = json.loads((research / 'programs.json').read_text())
identities = {r['place_id']: r for r in json.loads((research / 'sources/school-identities.json').read_text())}
schools = {}
fields = ['program_id', 'name', 'provider', 'activityType', 'eligibleGrades', 'age_groups', 'school_year',
          'payment_status', 'currency', 'rates', 'fees', 'day', 'startTime', 'endTime', 'duration_minutes',
          'duration_basis', 'term_start', 'term_end', 'term_weeks', 'service_days', 'schedule_text',
          'availability', 'registrationUrl', 'contact_phone', 'contact_email', 'notes']
for record in source['programs']:
    key = record['place_id']
    if not key:
        continue
    school = identities[key]
    row = schools.setdefault(key, dict(id=key, name=school['name'], address=school['address'],
                                      kind=school['sector'].title(), programs=[]))
    program = {field: record.get(field) for field in fields}
    program['evidence'] = [{field: item[field] for field in ['source_url', 'fields', 'retrieved_at', 'pdf_page']}
                           for item in record['evidence']]
    row['programs'].append(program)
out = dict(checked=source['retrieved_at'], timezone=source['timezone'], schools=list(schools.values()))
target = project / 'frontend/src/data/after-school.json'
target.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{len(schools)} campuses, {sum(len(s["programs"]) for s in schools.values())} program records -> {target}')
