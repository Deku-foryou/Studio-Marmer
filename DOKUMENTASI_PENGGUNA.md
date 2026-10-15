# Dokumentasi Pengguna Studio Marmer

Panduan ini ditujukan untuk pemilik usaha dan pengelola situs Studio Marmer. Isinya menjelaskan cara menggunakan situs dari sisi pengunjung dan admin dengan bahasa nonteknis.

> **Penting:** Nama menu, tombol, dan hak akses dapat berbeda mengikuti versi situs yang sedang dipakai. Gunakan panduan ini bersama tampilan aktual aplikasi. Jangan membagikan kata sandi admin atau informasi rahasia.

## Daftar Isi

1. [Mengenal Studio Marmer](#1-mengenal-studio-marmer)
2. [Peran Pengguna](#2-peran-pengguna)
3. [Mengakses Situs](#3-mengakses-situs)
4. [Panduan Pengunjung](#4-panduan-pengunjung)
5. [Masuk ke Area Admin](#5-masuk-ke-area-admin)
6. [Mengelola Produk](#6-mengelola-produk)
7. [Mengelola Kategori](#7-mengelola-kategori)
8. [Mengelola Galeri](#8-mengelola-galeri)
9. [Mengatur Konten Situs](#9-mengatur-konten-situs)
10. [Panduan Foto Produk](#10-panduan-foto-produk)
11. [Praktik Pengelolaan yang Disarankan](#11-praktik-pengelolaan-yang-disarankan)
12. [Pemecahan Masalah](#12-pemecahan-masalah)
13. [Keamanan Akun](#13-keamanan-akun)
14. [Daftar Periksa Sebelum Publikasi](#14-daftar-periksa-sebelum-publikasi)

## 1. Mengenal Studio Marmer

Studio Marmer adalah situs katalog untuk memperkenalkan produk kerajinan marmer kepada calon pelanggan. Pengunjung dapat melihat produk, membaca detail, melihat foto, lalu menghubungi pengelola atau membuka tautan transaksi eksternal yang tersedia.

Situs memiliki area admin untuk membantu pengelola memperbarui informasi tanpa harus mengubah kode program secara langsung.

## 2. Peran Pengguna

Secara umum terdapat dua kelompok pengguna:

- **Pengunjung:** melihat informasi dan katalog produk.
- **Admin/pengelola:** masuk ke area admin untuk mengelola konten sesuai hak akses.

Sistem mencatat peran `ADMIN` dan `EDITOR`. Hak akses tepat untuk setiap peran mengikuti konfigurasi sistem. Jika suatu menu tidak tersedia, akun tersebut mungkin tidak memiliki izin untuk menggunakannya.

## 3. Mengakses Situs

1. Buka alamat situs yang diberikan oleh pemilik atau pengelola.
2. Pastikan alamat domain benar dan menggunakan HTTPS jika sudah diterapkan.
3. Gunakan menu navigasi untuk membuka bagian situs.
4. Jika halaman tidak terbuka, periksa koneksi internet atau hubungi pengelola.

Alamat produksi tidak dicantumkan dalam dokumen ini karena perlu diisi sesuai domain yang benar-benar digunakan.

## 4. Panduan Pengunjung

### Melihat katalog

1. Buka beranda situs.
2. Cari bagian katalog produk.
3. Telusuri produk yang ditampilkan.
4. Pilih produk untuk membuka halaman detail.

### Membaca detail produk

Pada halaman detail, informasi yang tersedia dapat mencakup nama, foto, deskripsi, harga, jenis batu, warna, dimensi, berat, spesifikasi, estimasi pengerjaan, dan status ketersediaan. Tidak semua informasi harus terisi pada setiap produk.

### Menghubungi penjual

Jika tersedia, gunakan tautan Shopee atau tombol WhatsApp pada halaman produk. Tautan tersebut membuka layanan eksternal. Pastikan detail produk dan harga telah dikonfirmasi dengan pengelola sebelum melakukan transaksi.

### Melihat galeri dan informasi usaha

Gunakan bagian Galeri untuk melihat foto pilihan, bagian Tentang Kami untuk mengenal usaha, dan bagian Kontak untuk mencari informasi hubungan yang disediakan.

## 5. Masuk ke Area Admin

1. Buka alamat login admin yang diberikan oleh pengelola sistem. Pada konfigurasi proyek, rute login tercatat sebagai `/admin/login`.
2. Masukkan email dan kata sandi admin yang sudah diberikan secara aman.
3. Tekan tombol masuk.
4. Jika berhasil, sistem akan membuka area admin sesuai hak akses akun.

Jika login gagal:
- Periksa apakah email dan kata sandi sudah benar.
- Pastikan Caps Lock tidak aktif tanpa sengaja.
- Periksa koneksi dan status situs.
- Jangan mencoba menebak kata sandi berulang kali.
- Hubungi administrator jika akun belum dibuat, dinonaktifkan, atau perlu direset.

Jangan menuliskan kata sandi di catatan publik, tangkapan layar, atau dokumen panduan.

## 6. Mengelola Produk

Nama tombol dapat berbeda sesuai versi admin. Ikuti kontrol yang tersedia pada halaman produk.

### Menambahkan produk

1. Masuk ke admin.
2. Buka menu pengelolaan produk.
3. Pilih tindakan tambah produk.
4. Isi informasi yang diminta pada formulir.
5. Tambahkan foto produk sesuai mekanisme unggah yang tersedia.
6. Periksa kembali ejaan, harga, dimensi, spesifikasi, dan status ketersediaan.
7. Simpan produk.
8. Buka halaman publik produk untuk memastikan informasi tampil dengan benar.

### Mengisi informasi produk

| Informasi | Panduan |
|---|---|
| Nama produk | Gunakan nama yang jelas dan mudah dibedakan |
| Slug/URL | Gunakan format yang mudah dibaca; jika dibuat otomatis, periksa hasilnya |
| Deskripsi | Jelaskan bahan, kegunaan, karakteristik, dan hal penting lainnya |
| Harga | Masukkan harga sesuai kebijakan usaha dan format formulir |
| Jenis batu | Cantumkan jenis batu yang benar |
| Warna | Gunakan deskripsi warna yang sesuai produk sebenarnya |
| Dimensi | Cantumkan ukuran dan satuan dengan konsisten |
| Berat | Isi jika diketahui dan relevan |
| Spesifikasi | Tambahkan rincian yang membantu pembeli memahami produk |
| Waktu pengerjaan | Berikan estimasi realistis jika tersedia |
| Ketersediaan | Perbarui ketika stok atau kemampuan produksi berubah |
| Foto | Pilih foto produk yang jelas dan sesuai |
| Produk unggulan | Aktifkan hanya untuk produk yang ingin ditonjolkan |
| Tautan Shopee | Gunakan tautan produk yang benar jika tersedia |
| WhatsApp | Aktifkan sesuai pengaturan yang disediakan |

Kolom wajib dan batas maksimum ditentukan oleh formulir. Ikuti pesan validasi yang muncul jika penyimpanan ditolak.

### Mengubah produk

1. Buka daftar produk.
2. Pilih produk yang ingin diubah.
3. Perbarui informasi yang diperlukan.
4. Periksa foto dan tautan eksternal.
5. Simpan perubahan.
6. Periksa hasilnya di halaman publik.

Sebelum mengubah slug atau menghapus foto, periksa apakah tautan tersebut sedang digunakan pada materi promosi atau halaman lain.

### Menghapus produk

1. Pastikan produk memang tidak lagi perlu ditampilkan.
2. Periksa apakah penghapusan bersifat permanen dan apakah foto terkait ikut dihapus.
3. Jalankan tindakan hapus melalui antarmuka admin.
4. Periksa katalog publik setelah tindakan selesai.

Jika ragu, jangan menghapus produk. Nonaktifkan atau ubah status ketersediaan jika fitur tersebut tersedia.

### Produk unggulan dan ketersediaan

Gunakan penanda unggulan untuk produk yang ingin lebih terlihat. Perbarui status ketersediaan dengan jujur agar calon pembeli tidak memperoleh informasi yang sudah kedaluwarsa.

## 7. Mengelola Kategori

1. Buka menu kategori pada admin.
2. Tambahkan kategori baru atau pilih kategori yang sudah ada.
3. Isi nama dan informasi lain yang diminta.
4. Jika tersedia, pilih gambar kategori.
5. Simpan dan periksa hasilnya.

Sebelum menghapus kategori, periksa apakah kategori tersebut digunakan oleh produk. Perilaku penghapusan dan hubungan produk mengikuti aturan yang diterapkan oleh sistem.

## 8. Mengelola Galeri

1. Buka menu galeri.
2. Tambahkan foto atau pilih foto yang sudah tersimpan.
3. Isi judul, deskripsi, atau informasi lain jika formulir menyediakannya.
4. Simpan perubahan.
5. Buka halaman publik dan pastikan foto muncul dengan benar.

Gunakan foto yang relevan dengan usaha, beresolusi cukup, dan memiliki hak penggunaan. Hindari mengunggah foto yang memuat data pribadi atau informasi pelanggan tanpa izin.

## 9. Mengatur Konten Situs

Area pengaturan situs dapat menyediakan pengelolaan konten seperti gambar hero, logo, atau informasi lain. Ketersediaan kolom bergantung pada versi aplikasi.

1. Buka menu pengaturan situs.
2. Periksa nilai yang sudah ada sebelum menggantinya.
3. Ubah hanya bagian yang memang diperlukan.
4. Simpan perubahan.
5. Periksa halaman publik pada desktop dan ponsel.

Simpan salinan teks dan URL gambar lama sebelum menggantinya agar pemulihan lebih mudah jika hasil baru bermasalah.

## 10. Panduan Foto Produk

### Foto yang disarankan
- Gunakan pencahayaan yang cukup.
- Tampilkan produk dari sudut yang membantu pembeli memahami bentuknya.
- Gunakan latar belakang yang tidak mengganggu.
- Pastikan warna foto mendekati kondisi produk sebenarnya.
- Kompres gambar agar halaman tetap cepat dibuka.
- Gunakan foto yang diizinkan untuk dipublikasikan.

### Jika menggunakan URL gambar

Konfigurasi Next.js Image pada proyek tercatat membatasi host gambar eksternal. Host yang tercatat adalah `res.cloudinary.com` dan `images.unsplash.com`, dengan HTTPS serta aturan path tertentu. Konfigurasi produksi terbaru harus diperiksa sebelum menggunakan sumber lain.

URL yang terlihat benar belum tentu bisa ditampilkan. Jika gambar tidak muncul:
1. Periksa apakah URL dapat dibuka.
2. Pastikan protokolnya HTTPS jika dibutuhkan.
3. Pastikan host dan path sesuai konfigurasi situs.
4. Simpan ulang hanya setelah sumber gambar dipastikan benar.
5. Hubungi pengelola teknis jika masalah berlanjut.

Jangan memasukkan secret Cloudinary ke kolom URL atau membagikannya kepada orang lain.

## 11. Praktik Pengelolaan yang Disarankan

- Periksa harga dan ketersediaan secara berkala.
- Gunakan penamaan produk yang konsisten.
- Tulis deskripsi berdasarkan fakta produk.
- Periksa ejaan sebelum menyimpan.
- Pastikan tautan Shopee dan WhatsApp masih aktif.
- Gunakan foto yang benar dan tidak menyesatkan.
- Setelah perubahan, buka situs publik untuk memastikan hasilnya.
- Hindari mengubah banyak bagian sekaligus jika belum terbiasa.
- Catat perubahan penting agar tim dapat mengetahui apa yang berubah.

## 12. Pemecahan Masalah

| Masalah | Langkah awal |
|---|---|
| Tidak bisa login | Periksa email, kata sandi, koneksi, dan status akun |
| Produk tidak tersimpan | Baca pesan validasi; periksa kolom wajib dan format data |
| Foto tidak muncul | Periksa URL, format HTTPS, host/path yang diizinkan, dan status layanan gambar |
| Perubahan tidak terlihat | Muat ulang halaman; periksa apakah perubahan berhasil disimpan |
| Tautan Shopee tidak benar | Periksa URL produk di admin dan buka kembali tautannya |
| WhatsApp tidak terbuka | Periksa pengaturan dan nomor/tautan WhatsApp yang digunakan |
| Menu admin tidak tersedia | Periksa hak akses akun atau hubungi administrator |
| Situs tidak bisa dibuka | Periksa jaringan dan hubungi pengelola teknis; jangan mengubah konfigurasi server sendiri |

Jika menghubungi dukungan teknis, sertakan:
- Waktu kejadian.
- Halaman atau menu yang digunakan.
- Langkah yang dilakukan sebelum masalah muncul.
- Pesan error yang terlihat.
- Tangkapan layar yang tidak menampilkan password, token, atau data rahasia.

## 13. Keamanan Akun

- Jangan membagikan akun kepada orang yang tidak berwenang.
- Gunakan kata sandi kuat dan unik.
- Keluar dari admin setelah menggunakan komputer bersama.
- Jangan menyimpan kata sandi pada dokumen terbuka.
- Beri akses hanya kepada orang yang memerlukannya.
- Laporkan aktivitas yang tidak dikenal kepada pemilik atau administrator.
- Jangan mengirim berkas `.env`, token, atau secret melalui chat umum.

## 14. Daftar Periksa Sebelum Publikasi

Sebelum produk atau perubahan konten dianggap selesai, periksa:

- [ ] Nama dan deskripsi sudah benar.
- [ ] Harga sudah sesuai.
- [ ] Dimensi, warna, jenis batu, dan spesifikasi sudah diperiksa.
- [ ] Status ketersediaan sudah diperbarui.
- [ ] Foto tampil dengan benar.
- [ ] Tautan Shopee/WhatsApp berfungsi jika digunakan.
- [ ] Tampilan sudah diperiksa di ponsel dan desktop.
- [ ] Tidak ada informasi internal atau rahasia yang ikut dipublikasikan.

---

**Dokumen:** Dokumentasi Pengguna Studio Marmer  
**Bahasa:** Indonesia  
**Pembaca:** Pemilik usaha, pengelola konten, dan admin  
**Catatan:** Sesuaikan alamat situs, nama menu, dan prosedur yang bergantung pada deployment dengan versi aplikasi yang benar-benar digunakan.
