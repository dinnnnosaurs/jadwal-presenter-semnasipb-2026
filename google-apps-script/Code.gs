/**
 * Jadwal Presenter Semnas IPB 2026 — baca Google Sheets tanpa mengubah format asli.
 * Hanya kolom A–D (nomor, nama ketua, judul, skema) dan metadata ruang/jam yang diproses.
 * Kolom E ("Link Kelengkapan Berkas") TIDAK dikirim ke website.
 */
var ID_SPREADSHEET_JADWAL = '1SXgXv9Le3ym3Q3VYPkLlsFMYTr1bJyLk2mForCRERmY';
var TAB_JADWAL = [
  { name: 'Selasa, 1 Desember 2026', hari: 1, poster: true },
  { name: 'Rabu, 2 Desember 2026', hari: 2, poster: false },
  { name: 'Kamis, 3 Desember 2026', hari: 3, poster: false },
  { name: 'Jumat, 4 Desember 2026', hari: 4, poster: false }
];

function rapikanRuang(nilai, poster) {
  var v = String(nilai || '').trim();
  if (!v) return poster ? 'Ballroom 3' : '';
  if (poster) return v.replace(/^Ballrom/i, 'Ballroom');
  return /^(room|ruang|ballroom)\b/i.test(v) ? v : 'Room ' + v;
}
function rapikanJam(nilai) {
  var v = String(nilai || '').split('/')[0].trim();
  if (!v) return '';
  return v.replace(/\s*[-–—]\s*/g, '–').replace(/\s*WIB\s*$/i, '').trim() + ' WIB';
}

function bacaSeluruhJadwal() {
  var spreadsheet = SpreadsheetApp.openById(ID_SPREADSHEET_JADWAL);
  var records = [], perHari = {};
  TAB_JADWAL.forEach(function(tab) {
    var sheet = spreadsheet.getSheetByName(tab.name);
    if (!sheet) throw new Error('Tab tidak ditemukan: ' + tab.name);
    if (!sheet.getLastRow()) throw new Error('Tab kosong: ' + tab.name);
    var rows = sheet.getRange(1, 1, sheet.getLastRow(), 4).getDisplayValues();
    var ruang = tab.poster ? 'Ballroom 3' : '';
    var jam = '';
    var jumlah = 0;

    rows.forEach(function(row, index) {
      var no = String(row[0] || '').trim();
      var nama = String(row[1] || '').trim();
      var judul = String(row[2] || '').trim();
      var skema = String(row[3] || '').trim();
      var label = nama.toLowerCase();

      if (/^(room|ruang|tempat)$/.test(label)) ruang = rapikanRuang(judul, tab.poster);
      if (/^(waktu|waktu\s*\/\s*sesi|jam|jam\s*sesi|sesi)$/.test(label)) jam = rapikanJam(judul);

      if (!/^\d+$/.test(no) || !nama || !judul || !skema) return;
      if (!ruang || !jam) {
        throw new Error('Ruang/jam belum lengkap pada ' + tab.name + ' baris ' + (index + 1));
      }
      records.push({ nama: nama, judul: judul, skema: skema, hari: tab.hari, ruang: ruang, jam: jam });
      jumlah++;
    });
    perHari[String(tab.hari)] = jumlah;
  });
  if (!records.length) throw new Error('Tidak ada presenter');
  return { ok: true, count: records.length, perHari: perHari, records: records };
}

function doGet(e) {
  var callback = String((e && e.parameter && e.parameter.callback) || '');
  // Nama fungsi sederhana saja: mencegah injeksi JavaScript lewat parameter callback.
  if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(callback)) {
    return ContentService.createTextOutput('Callback tidak valid').setMimeType(ContentService.MimeType.TEXT);
  }
  var payload;
  try {
    payload = bacaSeluruhJadwal();
  } catch (err) {
    console.error(err);
    payload = { ok: false, error: 'Sumber jadwal tidak dapat dibaca.' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function ujiJadwal() {
  var payload = bacaSeluruhJadwal();
  console.log(JSON.stringify({ total: payload.count, perHari: payload.perHari }));
  return payload.count;
}
