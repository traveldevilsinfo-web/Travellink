#!/usr/bin/env python3
"""Run supabase/tests/*.test.sql against the LINKED project (no Docker) via `supabase db query --linked`.

Each test runs in a transaction that is rolled back; pgTAP is created inside it, so nothing persists.
The Management API returns only the last result set, so assertions are collected into a temp table.
Usage: python3 scripts/test-db-linked.py [file ...]   (dev project only — never point at production)
"""
import glob, json, re, subprocess, sys, tempfile

ASSERT = r'^select ((?:is|isnt|ok|throws_ok|lives_ok|results_eq)\()'

def wrap(src: str) -> str:
    src = src.replace('begin;', "begin;\ncreate extension if not exists pgtap with schema extensions;\n"
                      "create temp table _tap(n serial, line text);\ngrant all on _tap, _tap_n_seq to public;", 1)
    src = re.sub(ASSERT, r'insert into _tap(line) select \1', src, flags=re.M)
    return src.replace('select * from finish();', 'insert into _tap(line) select * from finish();\nselect line from _tap order by n;')

failed = 0
for f in sys.argv[1:] or sorted(glob.glob('supabase/tests/*.test.sql')):
    with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False) as t:
        t.write(wrap(open(f).read()))
    out = subprocess.run(['supabase', 'db', 'query', '--linked', '-f', t.name, '--output-format', 'json'], capture_output=True, text=True).stdout
    try:
        lines = [r['line'] for r in json.loads(out)['rows']]
    except Exception:
        lines = [f'not ok - could not run: {out[-300:]}']
    bad = [l for l in lines if l.startswith('not ok') or l.startswith('# Looks like')]
    failed += len(bad)
    print(f"{'FAIL' if bad else 'ok  '} {f} ({len([l for l in lines if l.startswith('ok')])} passed)")
    for l in bad: print('     ', l)
sys.exit(1 if failed else 0)
