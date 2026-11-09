# Menghubungkan Google Sheets dengan Jadwal Presenter Semnas IPB 2026

Integrasi disiapkan untuk:
- Website: https://dinnnnosaurs.github.io/jadwal-presenter-semnasipb-2026/
- Google Sheets: https://docs.google.com/spreadsheets/d/1SXgXv9Le3ym3Q3VYPkLlsFMYTr1bJyLk2mForCRERmY/edit
- Empat tab: Selasa 1, Rabu 2, Kamis 3, Jumat 4 Desember 2026.

## Kondisi awal
Pada pemeriksaan 9 November 2026 terdapat **695 jadwal**: 20 poster, 279 Rabu, 279 Kamis, 117 Jumat. Struktur Google Sheets **tidak perlu diubah**. Setiap blok memuat metadata \`Room\` / \`Tempat\`, \`Waktu/Sesi\` / \`Waktu\`, dan baris peserta dengan nomor di kolom A dan nama/judul/skema di kolom B–D.

**Kolom E "Link Kelengkapan Berkas" sengaja tidak dibaca atau dipublikasikan.** Website hanya menerima data publik berupa nama, judul, skema, hari, ruang, dan jam.

## 1. Aktifkan layanan Apps Script di akun Google

1. Buka spreadsheet asli menggunakan akun Google yang boleh membacanya.
2. Pilih **Extensions → Apps Script**.
3. Buat file baru, lalu salin isi [google-apps-script/Code.gs](google-apps-script/Code.gs).
4. Jalankan fungsi \`ujiJadwal\` dari editor, izinkan akses yang diminta, dan lihat **Execution log**. Harus menunjukkan total awal sekitar 695 (jumlah dapat bertambah atau berkurang setelah spreadsheet diedit).
5. Pilih **Deploy → New deployment → Web app**.
6. Atur **Execute as = Me** dan **Who has access = Anyone**. Perhatikan bahwa jadwal (hanya data yang disebut di atas) kemudian dapat dibaca publik.
7. Klik **Deploy**, salin URL Web App yang berakhir dengan \`/exec\`. Jangan gunakan URL \`/dev\`.

Jika kebijakan akun Google organisasi tidak mengizinkan akses "Anyone", metode ini memerlukan pendekatan otorisasi atau penerbitan data alternatif.

## 2. Aktifkan dari GitHub

1. Di \`index.html\`, cari deklarasi:
   \`var JADWAL_SYNC_APPS_SCRIPT_URL = 'GANTI_DENGAN_URL_APPS_SCRIPT_EXEC';\`
2. Ganti placeholder dengan URL \`/exec\` yang sudah disalin, tanpa mengubah tanda kutip.
3. Setelah diuji di cabang integrasi, gabungkan pull request ke \`main\` untuk memperbarui GitHub Pages.

## 3. Cara kerja
- Halaman menampilkan data bawaan HTML sebagai cadangan.
- Setelah situs dimuat, JavaScript meminta jadwal terkini ke Apps Script.
- Pencarian, penyaring tanggal, kartu, ruang, jam sesi, dan modal menggunakan data terbaru.
- Pengecekan diulang setiap **3 menit** selama halaman terbuka.
- Jika sumber data tidak bisa dibaca, situs tetap menampilkan data terakhir yang berhasil digunakan.
- Mengubah **isi spreadsheet** tidak mengharuskan perubahan atau deploy ulang kode GitHub/Apps Script.

## 4. Pengujian
- Ubah satu judul atau ruang di tab Google Sheets. Perbarui website dan cari perubahan tersebut.
- Buka F12 → Console untuk mencari log \`[Semnas IPB] Jadwal Google Sheets diperbarui:\`.
- Jika tidak muncul, periksa URL \`/exec\`, izin Web App, izin akses Apps Script ke spreadsheet, dan kesesuaian nama tab.
- Baris presenter baru harus berada dalam blok ruang/jam yang benar dan kolom A–D harus lengkap.
- Jangan masukkan informasi pribadi atau rahasia di kolom A–D atau metadata ruang/jam karena data tersebut akan publik.

## Catatan
Halaman publik *belum* menggunakan integrasi hingga URL Web App diisi dan PR digabungkan. Jangan langsung mengganti \`main\` sebelum memastikan Apps Script berfungsi. Tautan Zoom tetap mengikuti keadaan lama di situs; kolom E pada spreadsheet bukan sumber Zoom.
