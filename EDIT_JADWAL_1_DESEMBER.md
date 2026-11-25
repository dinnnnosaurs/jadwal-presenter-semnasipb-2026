# Mengedit jadwal 1 Desember 2026 melalui GitHub

Jadwal poster **1 Desember** dikelola di [`jadwal-1-desember.json`](jadwal-1-desember.json).
Jadwal **2–4 Desember** tetap diperbarui dari Google Sheets. Baris tanggal 1 dari
Google Sheets tidak akan mengganti data manual ini.

## Langkah edit

1. Buka [`jadwal-1-desember.json`](jadwal-1-desember.json) pada cabang `main`.
2. Klik ikon pensil **Edit this file**.
3. Ubah isian yang diperlukan:
   - `tanggal`: tanggal yang ditampilkan pada seluruh kartu poster.
   - `ruang`: lokasi yang berlaku untuk seluruh peserta poster.
   - `jam`: waktu yang berlaku untuk seluruh peserta poster.
   - `peserta`: daftar peneliti, masing-masing berisi `nama`, `judul`, dan `skema`.
   - Pada masing-masing peserta, `sesi` diisi `Pagi` atau `Siang`, `bagian` diisi
     `Bagian 1` atau `Bagian 2`.
4. Simpan melalui **Commit changes**.
5. Tunggu penerbitan GitHub Pages selesai, lalu muat ulang laman jadwal.

Tidak perlu mengedit `index.html` atau `database.json` untuk koreksi tanggal 1.
Halaman yang masih terbuka juga memeriksa perubahan setiap tiga menit.

## Format file

Contoh struktur (ilustrasi, bukan pengganti seluruh daftar peserta):

```json
{
  "tanggal": "Selasa, 1 Desember 2026",
  "ruang": "Ballroom 3",
  "jam": "10.30-11.00 WIB",
  "peserta": [
    {
      "nama": "Nama lengkap peneliti",
      "judul": "Judul penelitian",
      "skema": "Nama skema penelitian",
      "jam": "10.45-10.50 WIB",
      "sesi": "Pagi",
      "bagian": "Bagian 1"
    }
  ]
}
```

Untuk peserta yang memiliki lokasi atau jam berbeda, tambahkan `ruang` atau `jam`
pada peserta tersebut. Isian ini hanya berlaku untuk peserta itu; peserta lain
tetap memakai lokasi dan jam pada bagian atas file.

```json
{
  "nama": "Nama lengkap peneliti",
  "judul": "Judul penelitian",
  "skema": "Nama skema penelitian",
  "ruang": "Ruang alternatif",
  "jam": "11.00-11.30 WIB"
}
```

Sesi dan bagian tampil pada kartu serta detail jadwal poster.
Pembagian saat ini terdiri atas dua bagian pagi dan dua
bagian siang. Masing-masing bagian memuat lima peserta.

Pertahankan tanda kutip, koma, dan kurung JSON. Untuk tanda kutip di dalam judul,
gunakan `\"`. Peserta bisa ditambah, dihapus, atau diurutkan melalui daftar
`peserta`; urutan kartu mengikuti urutan daftar ini.

Jika file tidak dapat dibaca atau JSON tidak valid, laman mempertahankan data
terakhir yang berhasil dimuat. Pada kunjungan baru, data bawaan menjadi cadangan.

## Membuat ulang dari Excel

`build.py` membaca tanggal 1 dari file manual ini dan tanggal 2–4 dari Excel untuk
menyiapkan data cadangan. File manual tidak ditulis ulang oleh proses tersebut.
`template.html` sudah mengikuti versi tampilan dan pemisahan sumber yang sama
dengan `index.html`.

