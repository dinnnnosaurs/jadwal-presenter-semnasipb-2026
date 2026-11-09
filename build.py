# -*- coding: utf-8 -*-
"""
build.py — Regenerate database.json and index.html for "Jadwal Presenter".

Jalankan ini kalau file Excel jadwal berubah (ada koreksi ruangan, jadwal baru,
dsb). Letakkan file ini satu folder dengan:
  - template.html          (template halaman, sudah disediakan)
  - Jadwal_Presenter_Seminar_Nasional_2026.xlsx   (sumber data terbaru)

Lalu jalankan:
  python3 build.py

Hasilnya: database.json dan index.html akan ditulis ulang di folder yang sama.

Struktur Excel yang diharapkan (mengikuti format aslinya):
  - 1 sheet per hari ("Selasa, 1 Desember 2026", dst.)
  - Sheet hari pertama (poster): baris "Hari/tanggal", "Tempat", "Waktu" lalu
    tabel No/Nama Ketua Peneliti/Judul Penelitian/Skema Penelitian/Keterangan
  - Sheet hari lain (presentasi): blok berulang "Hari/tanggal seminar", "Room",
    "Waktu/Sesi", "PJ", "Moderator" lalu tabel No/Nama Ketua Peneliti/
    Judul Penelitian/Skema Penelitian/Link Kelengkapan Berkas
"""
import openpyxl
import json
import re
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'Jadwal_Presenter_Seminar_Nasional_2026.xlsx')
TEMPLATE = os.path.join(HERE, 'template.html')
OUT_DB = os.path.join(HERE, 'database.json')
OUT_HTML = os.path.join(HERE, 'index.html')

DAY_META = {
    'Selasa, 1 Desember 2026': {'day_num': 1, 'tag': 'Poster', 'short': '1 Des', 'type': 'Poster'},
    'Rabu, 2 Desember 2026':   {'day_num': 2, 'tag': 'Hari 1', 'short': '2 Des', 'type': 'Presentasi'},
    'Kamis, 3 Desember 2026':  {'day_num': 3, 'tag': 'Hari 2', 'short': '3 Des', 'type': 'Presentasi'},
    'Jumat, 4 Desember 2026':  {'day_num': 4, 'tag': 'Hari 3', 'short': '4 Des', 'type': 'Presentasi'},
}
ROOM_FIX = {'Ballrom 3': 'Ballroom 3'}  # koreksi typo umum di sumber data


def clean(v):
    if v is None:
        return ''
    return re.sub(r'\s+', ' ', str(v).strip())


def format_time(raw):
    raw = raw.strip()
    m = re.match(r'^(.*?)/(\d+)$', raw)
    if m:
        return f'{m.group(1).strip()} WIB', int(m.group(2))
    return raw, None


def format_room(raw, day_num):
    raw = raw.strip()
    if day_num == 1:
        return ROOM_FIX.get(raw, raw)
    return f'Room {raw}'


def parse(src_path):
    wb = openpyxl.load_workbook(src_path, data_only=True)
    records = []
    rid = 1
    for sheet_name in wb.sheetnames:
        meta = DAY_META.get(sheet_name)
        if meta is None:
            print(f'  (lewati sheet tak dikenal: {sheet_name})')
            continue
        ws = wb[sheet_name]
        grid = {}
        for row in ws.iter_rows(min_row=1, max_row=ws.max_row, min_col=1, max_col=6):
            for cell in row:
                if cell.value is not None and str(cell.value).strip() != '':
                    grid[(cell.row, cell.column)] = cell.value
        if not grid:
            continue
        max_row_used = max(r for r, c in grid.keys())

        current_date = current_room_raw = current_time_raw = None
        r = 1
        while r <= max_row_used:
            bval = grid.get((r, 2))
            if bval in ('Hari/tanggal seminar', 'Hari/tanggal'):
                current_date = clean(grid.get((r, 3))); r += 1; continue
            if bval in ('Room', 'Tempat'):
                current_room_raw = clean(grid.get((r, 3))); r += 1; continue
            if bval in ('Waktu/Sesi', 'Waktu'):
                current_time_raw = clean(grid.get((r, 3))); r += 1; continue
            if bval in ('PJ', 'Moderator'):
                r += 1; continue
            if grid.get((r, 1)) == 'No':
                r += 1
                while r <= max_row_used:
                    a, bname = grid.get((r, 1)), grid.get((r, 2))
                    if a is None and bname is None:
                        break
                    if bname in ('Hari/tanggal seminar', 'Hari/tanggal'):
                        break
                    if a is not None and bname is not None:
                        time_disp, sesi = format_time(current_time_raw)
                        records.append({
                            'id': rid, 'name': clean(bname), 'title': clean(grid.get((r, 3))),
                            'scheme': clean(grid.get((r, 4))), 'type': meta['type'],
                            'day_num': meta['day_num'], 'day_tag': meta['tag'], 'date': current_date,
                            'room': format_room(current_room_raw, meta['day_num']),
                            'room_raw': clean(current_room_raw), 'time': time_disp, 'session': sesi,
                        })
                        rid += 1
                    r += 1
                continue
            r += 1
    return records


def build_blob(records):
    names = sorted(set(r['name'] for r in records))
    name_idx = {n: i for i, n in enumerate(names)}
    schemes = sorted(set(r['scheme'] for r in records))
    scheme_idx = {s: i for i, s in enumerate(schemes)}
    time_lists = {}
    for r in records:
        d = str(r['day_num'])
        time_lists.setdefault(d, [])
        if r['time'] not in time_lists[d]:
            time_lists[d].append(r['time'])
    compact = []
    for r in records:
        d = str(r['day_num'])
        compact.append([
            name_idx[r['name']], r['title'], scheme_idx[r['scheme']], r['day_num'],
            r['room_raw'] if r['day_num'] != 1 else 0, time_lists[d].index(r['time']),
        ])
    day_info = {}
    for sheet_name, meta in DAY_META.items():
        matching = [r['date'] for r in records if r['day_num'] == meta['day_num']]
        if matching:
            day_info[str(meta['day_num'])] = {
                'tag': meta['tag'], 'type': meta['type'], 'short': meta['short'], 'date': matching[0],
            }
    payload = {'names': names, 'schemes': schemes, 'times': time_lists, 'days': day_info, 'records': compact}
    return json.dumps(payload, ensure_ascii=False, separators=(',', ':'))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    if not os.path.exists(src):
        print(f'ERROR: file Excel tidak ditemukan: {src}')
        sys.exit(1)
    if not os.path.exists(TEMPLATE):
        print(f'ERROR: template.html tidak ditemukan di: {TEMPLATE}')
        sys.exit(1)

    print(f'Membaca {src} ...')
    records = parse(src)
    print(f'  -> {len(records)} entri jadwal ditemukan')

    public_records = [{k: v for k, v in r.items() if k != 'room_raw'} for r in records]
    with open(OUT_DB, 'w', encoding='utf-8') as f:
        json.dump(public_records, f, ensure_ascii=False, indent=2)
    print(f'Ditulis: {OUT_DB}')

    blob = 'window.JADWAL_DB=' + build_blob(records) + ';'
    with open(TEMPLATE, encoding='utf-8') as f:
        tpl = f.read()
    if '/*__DATA_BLOB__*/' not in tpl:
        print('ERROR: placeholder /*__DATA_BLOB__*/ tidak ditemukan di template.html')
        sys.exit(1)
    final_html = tpl.replace('/*__DATA_BLOB__*/', blob)
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(final_html)
    print(f'Ditulis: {OUT_HTML} ({len(final_html.encode("utf-8"))//1024} KB)')
    print('Selesai.')


if __name__ == '__main__':
    main()
