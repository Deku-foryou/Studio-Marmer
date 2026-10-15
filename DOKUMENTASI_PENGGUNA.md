# Panduan Pengguna Studio Marmer

**Sasaran pembaca:** pemilik usaha dan pengelola konten  
**Tujuan:** menjelaskan penggunaan situs publik dan area administrasi.

Dokumen ini menjelaskan alur penggunaan berdasarkan fungsi proyek yang diketahui. Nama tombol dan susunan menu dapat berbeda menurut versi deployment. Jika tampilan aplikasi tidak sesuai dengan panduan, gunakan antarmuka aktual sebagai acuan dan minta konfirmasi pengelola teknis.

## 1. Fungsi Situs

Studio Marmer digunakan untuk:
- Menampilkan katalog dan detail produk kerajinan marmer.
- Menyajikan foto serta informasi usaha.
- Menyediakan tautan kontak atau kanal penjualan eksternal.
- Memberi pengelola akses untuk memperbarui data produk dan konten yang didukung aplikasi.

Situs ini tidak boleh dianggap menyediakan pembayaran internal atau pengelolaan pesanan menyeluruh kecuali fitur tersebut telah ditambahkan dan diuji secara terpisah.

## 2. Menggunakan Situs sebagai Pengunjung

### Melihat produk
1. Buka alamat situs resmi.
2. Cari bagian katalog di beranda.
3. Pilih produk untuk membuka detailnya.
4. Periksa deskripsi, harga, ukuran, ketersediaan, dan foto yang tersedia.

### Menghubungi pengelola
Gunakan tautan Shopee atau WhatsApp jika ditampilkan. Tautan tersebut mengarah ke layanan eksternal. Periksa kembali rincian dan harga dengan pengelola sebelum melakukan transaksi.

### Melihat informasi usaha
Gunakan bagian Tentang Kami, Galeri, dan Kontak untuk membaca informasi yang dipublikasikan.

## 3. Login Admin

Rute login yang tercatat pada proyek adalah `/admin/login`. Alamat lengkap mengikuti domain deployment.

1. Buka halaman login admin.
2. Masukkan kredensial yang diberikan administrator melalui jalur aman.
3. Kirim formulir login.
4. Setelah berhasil, gunakan menu yang tersedia sesuai peran akun.

Jika login gagal:
- Pastikan alamat email dan kata sandi benar.
- Periksa Caps Lock dan koneksi jaringan.
- Pastikan akun telah dibuat dan masih aktif.
- Hubungi administrator untuk pemeriksaan akun.

Jangan menuliskan kredensial pada dokumen, tangkapan layar, atau kanal komunikasi publik.

## 4. Mengelola Produk

Nama menu dan tombol mengikuti versi admin yang aktif. Secara umum, proses pengelolaan produk adalah sebagai berikut.

### Menambahkan produk
1. Masuk ke area admin.
2. Buka pengelolaan produk.
3. Pilih fungsi tambah produk.
4. Isi field yang tersedia pada formulir.
5. Unggah atau pilih foto jika fungsi tersebut tersedia.
6. Periksa kembali data.
7. Simpan.
8. Buka situs publik untuk memverifikasi hasilnya.

### Mengisi data produk

| Field | Panduan pengisian |
|---|---|
| Nama | Nama yang jelas dan membedakan produk |
| Deskripsi | Informasi faktual mengenai produk |
| Harga | Harga yang telah disetujui pemilik usaha |
| Jenis batu | Jenis material yang benar |
| Warna | Deskripsi warna yang sesuai produk |
| Dimensi | Ukuran beserta satuan yang konsisten |
| Berat | Isi jika tersedia dan relevan |
| Spesifikasi | Rincian teknis yang dibutuhkan pembeli |
| Waktu pengerjaan | Estimasi realistis jika diterapkan |
| Ketersediaan | Status terkini |
| Foto | Foto produk yang sesuai dan layak dipublikasikan |
| Produk unggulan | Aktifkan jika produk perlu ditonjolkan |
| Shopee/WhatsApp | Tautan yang telah diverifikasi |

Field wajib, batas jumlah spesifikasi/foto, dan format input mengikuti validasi pada formulir aktual. Jika penyimpanan ditolak, baca pesan validasi dan koreksi field terkait.

### Mengubah produk
1. Buka daftar produk.
2. Pilih produk yang hendak diperbarui.
3. Ubah field yang diperlukan.
4. Simpan perubahan.
5. Periksa halaman publik.

Sebelum mengubah slug atau tautan, pertimbangkan apakah alamat tersebut telah digunakan pada materi promosi.

### Menghapus produk
1. Pastikan penghapusan memang diperlukan.
2. Periksa dampaknya terhadap tampilan publik dan media terkait.
3. Gunakan fungsi hapus pada admin.
4. Verifikasi hasilnya.

Jangan menghapus data hanya untuk menyembunyikan produk sementara. Gunakan status ketersediaan jika fungsi itu memenuhi kebutuhan.

## 5. Mengelola Kategori

1. Buka menu kategori.
2. Pilih tambah atau edit sesuai kebutuhan.
3. Isi informasi yang diminta.
4. Simpan perubahan.
5. Periksa hasilnya di admin dan situs publik jika kategori ditampilkan.

Sebelum menghapus kategori, periksa hubungannya dengan produk. Efek penghapusan bergantung pada aturan aplikasi.

## 6. Mengelola Galeri

1. Buka menu galeri.
2. Tambahkan atau pilih item galeri.
3. Isi judul/deskripsi jika field tersebut tersedia.
4. Simpan.
5. Periksa apakah gambar tampil di situs publik.

Publikasikan hanya foto yang boleh digunakan oleh usaha. Hindari gambar yang memuat informasi pribadi tanpa izin.

## 7. Mengatur Konten Situs

Jika menu pengaturan situs tersedia:
1. Buka pengaturan.
2. Catat atau salin nilai lama sebelum menggantinya.
3. Ubah hanya field yang diperlukan.
4. Simpan.
5. Periksa halaman publik pada desktop dan ponsel.

Tidak semua versi aplikasi menyediakan field yang sama. Jangan mengubah pengaturan teknis tanpa arahan pengelola sistem.

## 8. Pengelolaan Foto

Gunakan gambar yang jelas, relevan, dan memiliki hak publikasi. Hindari file berukuran sangat besar jika versi gambar yang lebih ringan dapat digunakan tanpa mengurangi kualitas secara berarti.

Jika memasukkan URL gambar:
- Pastikan URL benar dan dapat diakses.
- Periksa protokol dan sumber gambar yang diizinkan konfigurasi situs.
- Ingat bahwa URL yang valid secara format belum tentu bisa ditampilkan oleh Next.js Image.
- Jika gambar gagal muncul, jangan mengubah konfigurasi server sendiri. Catat URL dan pesan error yang terlihat, lalu hubungi pengelola teknis.

Jangan membagikan API secret Cloudinary atau kredensial lain.

## 9. Pemeriksaan Setelah Perubahan

Setelah memperbarui konten, periksa:
- Nama, deskripsi, harga, dan spesifikasi.
- Status ketersediaan.
- Foto dan urutannya.
- Tautan Shopee atau WhatsApp.
- Tampilan di desktop dan ponsel.
- Apakah perubahan tersimpan dan tampil pada halaman yang benar.

## 10. Pemecahan Masalah

| Kendala | Tindakan awal |
|---|---|
| Login ditolak | Periksa kredensial, status akun, dan koneksi |
| Produk gagal disimpan | Baca pesan validasi dan periksa field wajib |
| Foto tidak muncul | Periksa URL, sumber gambar, dan pesan error |
| Perubahan belum terlihat | Muat ulang halaman dan pastikan penyimpanan berhasil |
| Tautan eksternal salah | Periksa kembali URL pada data produk |
| Menu tidak tersedia | Pastikan peran akun memiliki izin |
| Situs tidak dapat dibuka | Periksa koneksi dan hubungi pengelola teknis |

Saat melaporkan masalah, sertakan waktu kejadian, halaman yang digunakan, langkah sebelum error, dan pesan error. Jangan sertakan password, token, atau secret dalam tangkapan layar.

## 11. Keamanan Akun

- Gunakan kata sandi unik.
- Jangan membagikan akun kepada pihak yang tidak berwenang.
- Keluar dari admin setelah memakai perangkat bersama.
- Berikan akses sesuai tanggung jawab.
- Laporkan aktivitas yang tidak dikenal.
- Jangan mengirim file `.env`, token, atau secret melalui kanal umum.

## 12. Daftar Periksa Publikasi

- [ ] Data produk telah diperiksa.
- [ ] Harga dan status ketersediaan benar.
- [ ] Foto sesuai dengan produk.
- [ ] Tautan eksternal berfungsi.
- [ ] Tampilan mobile dan desktop telah diperiksa.
- [ ] Tidak ada data internal atau rahasia yang terpublikasi.

---

**Dokumen:** Panduan Pengguna Studio Marmer  
**Bahasa:** Indonesia  
**Pemeliharaan:** perbarui dokumen ketika alur admin, fitur, atau deployment berubah.
