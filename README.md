# Studio Marmer

Repositori aplikasi web Studio Marmer.

Studio Marmer menyediakan katalog digital untuk produk kerajinan marmer serta area administrasi untuk mengelola data produk dan konten situs. Pengunjung dapat melihat informasi produk dan menggunakan kanal kontak atau tautan eksternal yang tersedia untuk melanjutkan komunikasi dengan pengelola.

Dokumen ini menjelaskan ruang lingkup aplikasi, komponen teknologi, cara menjalankan lingkungan pengembangan, dan hal-hal operasional yang perlu diperhatikan.

## Daftar Isi

- [Ruang Lingkup](#ruang-lingkup)
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [Model Informasi Produk](#model-informasi-produk)
- [Persyaratan Pengembangan](#persyaratan-pengembangan)
- [Menyiapkan Lingkungan Lokal](#menyiapkan-lingkungan-lokal)
- [Konfigurasi](#konfigurasi)
- [Database](#database)
- [Pengelolaan Media](#pengelolaan-media)
- [Pemeriksaan Kualitas](#pemeriksaan-kualitas)
- [Keamanan Operasional](#keamanan-operasional)
- [Build dan Deployment](#build-dan-deployment)
- [Batasan Fungsional](#batasan-fungsional)
- [Dokumentasi Pengguna](#dokumentasi-pengguna)

## Ruang Lingkup

Aplikasi terdiri atas dua area:

1. **Situs publik**, untuk menampilkan informasi usaha, katalog produk, detail produk, galeri, dan informasi kontak.
2. **Area administrasi**, untuk mengelola produk, kategori, galeri, serta pengaturan situs yang disediakan aplikasi.

Situs ini berfungsi sebagai katalog dan titik masuk komunikasi dengan calon pelanggan. Transaksi dapat dilanjutkan melalui tautan eksternal seperti Shopee atau WhatsApp apabila tautan tersebut dikonfigurasi. Pembayaran internal tidak dinyatakan sebagai bagian dari ruang lingkup saat ini.

## Fitur

### Situs publik
- Beranda dengan bagian katalog produk.
- Halaman detail produk berdasarkan slug.
- Bagian Tentang Kami, Galeri, dan Kontak.
- Informasi produk sesuai data yang diisi pengelola.
- Tautan eksternal untuk menghubungi penjual atau membuka kanal penjualan.

### Area administrasi
- Autentikasi pengguna admin.
- Pengelolaan produk.
- Pengelolaan kategori.
- Pengelolaan gambar galeri.
- Pengaturan situs yang tersedia pada aplikasi.
- Otorisasi berbasis peran `ADMIN` dan `EDITOR`.

Rincian akses setiap peran mengikuti implementasi otorisasi pada versi aplikasi yang dijalankan.

## Teknologi

Komponen utama yang tercatat pada proyek:

| Komponen | Teknologi | Penggunaan |
|---|---|---|
| Framework web | Next.js 16, App Router | Routing, rendering halaman, dan fungsi server |
| UI | React 19 | Komponen antarmuka |
| Bahasa | TypeScript | Tipe statis pada kode aplikasi |
| Styling | Tailwind CSS v4 | Styling dan layout |
| Akses database | Prisma ORM 6 | Akses data dari kode server |
| Database | MySQL | Penyimpanan data aplikasi |
| Autentikasi | Auth.js v5 beta, Credentials, JWT | Login dan sesi admin |
| Media | Cloudinary | Penyimpanan dan pengelolaan gambar |
| Pengujian | Vitest | Tes otomatis |
| Analisis kode | ESLint, TypeScript compiler | Pemeriksaan kode dan tipe |
| Runtime dan package manager | Node.js, npm | Menjalankan aplikasi dan mengelola dependency |

Versi paket yang tepat mengikuti `package.json` dan lockfile pada commit yang digunakan. Daftar ini merupakan ringkasan arsitektur, bukan pengganti pemeriksaan dependency saat rilis.

## Arsitektur Aplikasi

Aplikasi menggunakan Next.js App Router. Komponen halaman, fungsi server, validasi input, dan akses database berada dalam satu codebase. Prisma menjadi lapisan akses data ke MySQL. Cloudinary digunakan untuk operasi media yang dikonfigurasi dalam aplikasi.

Alur umum permintaan:

1. Browser meminta halaman atau melakukan tindakan dari antarmuka.
2. Next.js menangani routing dan rendering.
3. Data yang diperlukan dibaca atau diubah melalui fungsi server.
4. Input divalidasi sebelum diproses.
5. Prisma berkomunikasi dengan MySQL untuk operasi data.
6. Hasil dikembalikan ke halaman atau antarmuka admin.

Akses admin harus melewati autentikasi dan pemeriksaan otorisasi yang diterapkan aplikasi. Detail implementasi dan batas kepercayaan harus dinilai dari kode pada commit yang sedang dirilis.

## Model Informasi Produk

Data produk dapat mencakup:
- Nama dan slug.
- Deskripsi dan harga.
- Jenis batu dan warna.
- Dimensi dan berat.
- Spesifikasi produk.
- Estimasi waktu pengerjaan.
- Status ketersediaan.
- Foto produk.
- Penanda produk unggulan.
- Tautan Shopee dan pengaturan WhatsApp.

Field wajib, validasi, batas jumlah baris spesifikasi atau foto, serta aturan penghapusan ditentukan oleh implementasi formulir dan skema aplikasi. Gunakan kode pada commit aktif sebagai acuan final.

## Persyaratan Pengembangan

Untuk menjalankan aplikasi secara lokal, siapkan:
- Node.js yang kompatibel dengan Next.js dan skrip proyek.
- npm.
- MySQL.
- Akun dan konfigurasi Cloudinary jika menguji fungsi media.
- Git.
- Browser modern.

Beberapa skrip browser/E2E menggunakan opsi Node.js `--env-file-if-exists`; untuk menjalankan skrip tersebut gunakan Node.js 22.9.0 atau lebih baru. Periksa `package.json` dan dokumentasi deployment untuk persyaratan versi yang berlaku.

## Menyiapkan Lingkungan Lokal

Jalankan perintah dari direktori repositori.

### 1. Pasang dependency

```bash
npm install
```

### 2. Siapkan konfigurasi lokal

Buat `.env` berdasarkan variabel yang benar-benar dibaca aplikasi. Jangan menyalin kredensial produksi ke komputer pengembangan jika tidak diperlukan. Jangan commit `.env`.

### 3. Siapkan database

Pastikan layanan MySQL aktif dan database sesuai connection string sudah tersedia. Nama database yang digunakan pada lingkungan pengembangan proyek tercatat sebagai `studio_marmer`.

Validasi konfigurasi Prisma:

```bash
npx prisma validate
```

Periksa status migrasi:

```bash
npx prisma migrate status
```

Jalankan migrasi sesuai prosedur lingkungan yang digunakan. Untuk database produksi, migrasi harus melalui proses deployment yang disetujui dan didahului backup yang memadai.

### 4. Jalankan server pengembangan

```bash
npm run dev
```

Buka URL lokal yang dicetak di terminal, biasanya `http://localhost:3000`.

Untuk melihat perintah yang tersedia:

```bash
npm run
```

Jangan menjalankan proses build bersamaan dengan development server jika keduanya menggunakan direktori output `.next` yang sama.

## Konfigurasi

Nama dan kebutuhan variabel lingkungan harus dikonfirmasi melalui kode aplikasi, konfigurasi Prisma, dan skrip yang dijalankan. Integrasi proyek dapat menggunakan kelompok konfigurasi berikut:

| Kelompok | Keterangan |
|---|---|
| Database | Connection string MySQL, umumnya `DATABASE_URL` |
| Autentikasi | Secret Auth.js, umumnya `AUTH_SECRET` |
| Seed dan tes | Kredensial khusus untuk proses seed atau tes admin jika digunakan |
| Cloudinary | Nama cloud, API key, API secret, dan upload preset sesuai alur media |

Nama di atas merupakan petunjuk pemeriksaan, bukan daftar final variabel wajib. Jangan menebak nilai konfigurasi atau menaruh kredensial dalam dokumentasi publik.

Aturan:
- `.env` tidak boleh masuk ke repositori.
- Jangan memberi awalan `NEXT_PUBLIC_` pada secret server.
- Nilai `NEXT_PUBLIC_*` dapat dikirim ke browser.
- Gunakan secret terpisah untuk development, staging, dan production.
- Rotasi secret jika pernah terekspos.

## Database

MySQL menyimpan data persisten. Prisma mendefinisikan model data dan menyediakan API akses data untuk kode server.

Perintah diagnostik yang umum:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

`prisma generate` menghasilkan client berdasarkan schema. `migrate status` memeriksa status migrasi. Penggunaan perintah migrasi yang mengubah database harus disesuaikan dengan lingkungan.

Jangan menjalankan `prisma migrate reset` pada database berisi data penting karena perintah tersebut dapat menghapus data. Backup sebelum perubahan skema.

## Pengelolaan Media

Cloudinary digunakan untuk penyimpanan atau pengelolaan gambar sesuai konfigurasi aplikasi. Nama cloud dan upload preset yang pernah tercatat pada lingkungan pengembangan tidak dijadikan nilai universal; periksa konfigurasi deployment aktif sebelum menggunakannya.

Perhatian teknis:
- URL yang lolos pemeriksaan format belum tentu diizinkan oleh Next.js Image.
- `images.remotePatterns` membatasi host, protokol, dan path gambar eksternal.
- Content Security Policy juga membatasi sumber gambar.
- Perubahan konfigurasi media perlu diuji pada halaman produk, galeri, logo, dan hero.
- Operasi yang membutuhkan API secret harus dijalankan di server.

## Pemeriksaan Kualitas

Skrip yang tercatat dalam proyek meliputi:

```bash
npm test
npx eslint .
npx tsc --noEmit
npm run verify:forms
npm run test:scripts
```

Gunakan `npm run` untuk memeriksa nama skrip aktual. Tidak semua pemeriksaan browser/E2E dapat dijalankan tanpa server, database, browser, dan akun uji yang sesuai.

Sebelum rilis, lakukan pemeriksaan setidaknya terhadap:
- Tes unit dan validasi formulir.
- ESLint dan TypeScript.
- Login dan otorisasi admin.
- Operasi tambah, ubah, dan hapus data.
- Unggah dan tampilan media.
- Tautan eksternal.
- Tampilan desktop dan perangkat seluler.
- Alur E2E pada lingkungan uji yang dikonfigurasi.

Catat perintah yang dijalankan dan hasil aktual. Jangan menyatakan tes lulus jika belum dijalankan.

## Keamanan Operasional

- Gunakan akun admin individual bila didukung alur operasional.
- Terapkan hak akses minimum sesuai tanggung jawab.
- Gunakan HTTPS di lingkungan produksi.
- Simpan secret pada environment variable atau secret manager.
- Jangan membagikan `.env`, token, password, atau API secret.
- Batasi akses jaringan ke database.
- Lakukan backup dan uji prosedur pemulihan.
- Tinjau pembaruan dependency sebelum diterapkan.
- Nonaktifkan akses yang tidak lagi dibutuhkan.

## Build dan Deployment

Proses deployment harus disesuaikan dengan penyedia hosting dan konfigurasi produksi. Secara umum:

1. Tentukan commit yang akan dirilis.
2. Siapkan runtime Node.js, environment variable, dan koneksi MySQL.
3. Pastikan migrasi database telah ditinjau dan memiliki rencana pemulihan.
4. Konfigurasikan domain, HTTPS, dan Cloudinary.
5. Jalankan pipeline build dan pemeriksaan kualitas.
6. Deploy artefak aplikasi.
7. Verifikasi halaman publik dan seluruh alur admin yang penting.
8. Pantau log aplikasi setelah rilis.

Dokumen ini tidak menetapkan penyedia hosting, kapasitas, SLA, atau biaya layanan. Hal-hal tersebut bergantung pada keputusan deployment.

## Batasan Fungsional

- Aplikasi berfungsi sebagai katalog dan pengelolaan konten.
- Shopee dan WhatsApp merupakan kanal eksternal jika dikonfigurasi.
- Pembayaran internal, manajemen pengiriman, pelacakan pesanan, dan notifikasi transaksi tidak boleh dianggap tersedia tanpa implementasi terpisah yang telah diverifikasi.
- Keberhasilan menampilkan gambar bergantung pada URL serta kebijakan host, protokol, dan path.
- Harga, ketersediaan, deskripsi, dan tautan produk harus dipelihara oleh pengelola.

## Dokumentasi Pengguna

Panduan operasional untuk pemilik usaha dan admin tersedia di [`DOKUMENTASI_PENGGUNA.md`](./DOKUMENTASI_PENGGUNA.md).

