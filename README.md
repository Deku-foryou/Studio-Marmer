# Studio Marmer

Dokumentasi teknis dan pengantar proyek situs katalog serta pengelolaan produk kerajinan marmer.

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Gambaran Arsitektur](#gambaran-arsitektur)
- [Struktur Fitur](#struktur-fitur)
- [Spesifikasi dan Batasan](#spesifikasi-dan-batasan)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Menjalankan Proyek di Lokal](#menjalankan-proyek-di-lokal)
- [Konfigurasi Lingkungan](#konfigurasi-lingkungan)
- [Database dan Prisma](#database-dan-prisma)
- [Gambar Produk dan Cloudinary](#gambar-produk-dan-cloudinary)
- [Pengujian dan Pemeriksaan Kualitas](#pengujian-dan-pemeriksaan-kualitas)
- [Keamanan dan Pengelolaan Akses](#keamanan-dan-pengelolaan-akses)
- [Deployment dan Pemeliharaan](#deployment-dan-pemeliharaan)
- [Batasan yang Perlu Diketahui](#batasan-yang-perlu-diketahui)
- [Dokumentasi Pengguna](#dokumentasi-pengguna)
- [Lisensi dan Hak Penggunaan](#lisensi-dan-hak-penggunaan)

## Tentang Project

**Studio Marmer** adalah situs katalog digital untuk menampilkan produk kerajinan marmer. Situs ditujukan untuk membantu calon pelanggan menjelajahi produk, melihat detail dan galeri gambar, mengetahui informasi produk, lalu menghubungi penjual atau melanjutkan transaksi melalui kanal eksternal yang disediakan.

Situs juga memiliki area admin untuk mengelola konten yang ditampilkan, seperti produk, kategori, galeri, dan pengaturan situs. Situs ini bukan marketplace multi-penjual dan alur pembayaran internal tidak menjadi bagian dari fungsi yang terdokumentasi di sini.

## Fitur Utama

### Area pengunjung

- Beranda dengan bagian katalog produk.
- Daftar produk dan halaman detail produk berdasarkan slug.
- Informasi produk, termasuk atribut yang tersedia pada data produk.
- Bagian Tentang Kami, Galeri, dan Kontak.
- Tautan menuju Shopee dan/atau WhatsApp jika dikonfigurasi pada produk atau situs.
- Tampilan responsif yang ditujukan untuk desktop dan perangkat seluler.

### Area admin

- Halaman masuk admin.
- Pengelolaan data produk (tambah, lihat, ubah, dan hapus sesuai izin serta implementasi).
- Pengelolaan kategori.
- Pengelolaan foto galeri.
- Pengaturan konten situs yang tersedia.
- Pembatasan akses berbasis peran admin, termasuk peran `ADMIN` dan `EDITOR`.

> Rincian tombol dan perilaku dapat berbeda sesuai versi deployment. Lihat `DOKUMENTASI_PENGGUNA.md` untuk alur penggunaan.

## Teknologi yang Digunakan


| Teknologi                         | Peran                                                                  |
| --------------------------------- | ---------------------------------------------------------------------- |
| Next.js 16 (App Router)           | Framework aplikasi web, routing, rendering halaman, dan fungsi server  |
| React 19                          | Penyusunan antarmuka berbasis komponen                                 |
| TypeScript                        | Pemeriksaan tipe untuk membantu mengurangi kesalahan saat pengembangan |
| Tailwind CSS v4                   | Styling dan tata letak antarmuka                                       |
| Prisma ORM 6                      | Akses dan pemodelan data database dari kode aplikasi                   |
| MySQL                             | Penyimpanan data terstruktur                                           |
| Auth.js v5 beta, Credentials, JWT | Autentikasi admin berbasis kredensial dan sesi token                   |
| Cloudinary                        | Penyimpanan dan pengelolaan media gambar                               |
| Vitest                            | Pengujian unit dan pengujian otomatis                                  |
| ESLint                            | Pemeriksaan kualitas dan pola kode                                     |
| TypeScript compiler (`tsc`)       | Pemeriksaan tipe statis                                                |
| Node.js dan npm                   | Runtime JavaScript serta pengelolaan paket dan perintah proyek         |


Versi patch dan versi paket yang tepat mengikuti `package.json` serta lockfile pada repositori. Tabel ini merangkum teknologi utama yang tercatat, bukan menggantikan pemeriksaan dependency pada rilis terbaru.

## Gambaran Arsitektur

Secara garis besar, aplikasi bekerja dengan alur berikut:

1. Browser membuka situs Next.js.
2. Next.js menyajikan halaman pengunjung atau area admin.
3. Fungsi server aplikasi menjalankan validasi dan aturan bisnis.
4. Prisma digunakan oleh kode server untuk membaca atau mengubah data MySQL.
5. Cloudinary menangani media gambar sesuai konfigurasi.
6. Autentikasi dan pemeriksaan izin membatasi halaman serta tindakan admin.

Aplikasi memakai pendekatan **server-first** untuk bagian yang tidak membutuhkan interaksi browser. Komponen interaktif digunakan saat dibutuhkan, misalnya untuk filter atau keranjang di sisi klien. Detail implementasi dapat berubah mengikuti kode terbaru.

## Struktur Fitur


| Area             | Fungsi                                       |
| ---------------- | -------------------------------------------- |
| Beranda          | Pengenalan usaha dan bagian katalog          |
| Detail produk    | Informasi produk berdasarkan slug            |
| Tentang Kami     | Informasi usaha                              |
| Galeri           | Menampilkan foto pilihan                     |
| Kontak           | Informasi atau kanal untuk menghubungi usaha |
| Login admin      | Autentikasi pengelola                        |
| Admin produk     | Mengelola produk dan atributnya              |
| Admin kategori   | Mengelola kategori                           |
| Admin galeri     | Mengelola gambar galeri                      |
| Pengaturan situs | Mengelola pengaturan konten yang tersedia    |


Rute `/produk` pernah ditetapkan sebagai 404, sedangkan katalog ditampilkan melalui bagian beranda dan detail menggunakan `/produk/[slug]`. Periksa kembali perilaku ini pada deployment terbaru sebelum menjanjikan URL tertentu kepada pelanggan.

## Spesifikasi dan Batasan

### Data produk

Model produk mendukung sejumlah informasi, sesuai konfigurasi aplikasi, antara lain:

- Nama dan slug produk.
- Deskripsi.
- Harga.
- Jenis batu.
- Warna.
- Dimensi dan berat.
- Spesifikasi produk.
- Estimasi waktu pengerjaan.
- Status ketersediaan.
- Foto produk.
- Penanda produk unggulan.
- URL Shopee.
- Pengaturan penggunaan WhatsApp.

Pastikan kolom yang wajib diisi dan pilihan yang tersedia dilihat langsung dari formulir admin versi yang digunakan.

### Katalog dan transaksi

- Situs berfungsi sebagai katalog dan sarana mengarahkan calon pelanggan ke kanal transaksi eksternal.
- Tidak ada bukti dalam dokumentasi proyek bahwa pembayaran kartu, pembayaran otomatis, atau pemrosesan pesanan penuh telah terhubung ke payment gateway.
- Jangan mengiklankan fitur pembayaran internal atau pelacakan pesanan jika belum benar-benar dikembangkan dan diuji.

### Batas gambar

- Konfigurasi Next.js Image tercatat mengizinkan `images.unsplash.com` dengan pola path tertentu dan `res.cloudinary.com` melalui HTTPS.
- URL yang lolos validasi format umum belum tentu dapat ditampilkan oleh komponen gambar Next.js. Periksa host, protokol, dan path sesuai konfigurasi aktual.
- Media Cloudinary membutuhkan konfigurasi akun dan preset yang sesuai.

### Akun dan peran

- Sistem autentikasi admin menggunakan Auth.js dengan provider Credentials dan JWT.
- Masa berlaku JWT tercatat 8 jam.
- Peran yang tercatat adalah `ADMIN` dan `EDITOR`. Hak akses detail harus dikonfirmasi dari middleware dan server actions versi terbaru.

## Persyaratan Sistem

Untuk pengembangan lokal, gunakan:

- Node.js yang kompatibel dengan versi Next.js dan perintah pada `package.json`.
- npm.
- MySQL yang berjalan dan dapat diakses aplikasi.
- Akun Cloudinary jika menguji unggah atau penghapusan media.
- Browser modern.
- Git untuk mengambil kode dan menyimpan checkpoint.

Catatan: skrip E2E tertentu memakai fitur Node.js `--env-file-if-exists`, yang tersedia pada Node.js 22.9.0 ke atas. Gunakan versi Node.js yang sesuai dengan konfigurasi proyek saat ini.

## Menjalankan Proyek di Lokal

> Jalankan perintah dari folder akar repositori. Nama skrip harus dicocokkan dengan `package.json` versi yang sedang digunakan.

1. Ambil repositori dan masuk ke folder proyek:
   ```bash
    git clone <URL_REPOSITORI>
    cd studio-marmer
   ```

    Jika repositori sudah tersedia secara lokal, cukup masuk ke folder proyek.
2. Pasang dependency:
   ```bash
    npm install
   ```
3. Siapkan MySQL dan database sesuai nama yang dipakai pada konfigurasi lokal. Nama database yang tercatat dalam pengembangan adalah `studio_marmer`.
4. Buat berkas `.env` lokal berdasarkan variabel yang benar-benar dibutuhkan kode. Jangan commit berkas ini.
5. Jalankan migrasi Prisma sesuai konfigurasi proyek:
   ```bash
    npx prisma migrate deploy
   ```

    Untuk lingkungan pengembangan yang memang memakai migrasi baru, perintah yang sesuai dapat berbeda. Jangan menjalankan migrasi pada database produksi tanpa backup dan persetujuan.
6. Jalankan server pengembangan:
   ```bash
    npm run dev
   ```
7. Buka alamat lokal yang dicetak oleh terminal, biasanya `http://localhost:3000`.

Jika proyek menggunakan seed untuk membuat akun admin, jalankan hanya sesuai instruksi seed resmi proyek dan gunakan kredensial yang aman. Jangan menebak atau memakai akun contoh di lingkungan produksi.

## Konfigurasi Lingkungan

Nama variabel wajib harus diverifikasi dari kode server, `prisma/schema.prisma`, dan dokumentasi deployment. Variabel yang mungkin dibutuhkan berdasarkan integrasi proyek:


| Kelompok          | Contoh nama variabel                                                | Keterangan                                                     |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Database          | `DATABASE_URL`                                                      | Connection string MySQL                                        |
| Auth.js           | `AUTH_SECRET`                                                       | Secret untuk mekanisme autentikasi                             |
| Seed admin        | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                           | Dipakai oleh alur seed atau tes tertentu yang memerlukan admin |
| Cloudinary        | `CLOUDINARY_CLOUD_NAME`                                             | Nama cloud                                                     |
| Cloudinary        | `CLOUDINARY_API_KEY`                                                | API key server-side jika dibutuhkan                            |
| Cloudinary        | `CLOUDINARY_API_SECRET`                                             | Secret server-side untuk operasi yang memerlukan tanda tangan  |
| Cloudinary upload | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` atau konfigurasi publik terkait | Hanya jika memang digunakan di sisi browser                    |
| Cloudinary upload | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`                              | Preset unsigned upload yang tercatat untuk proyek              |


Daftar di atas adalah panduan pemeriksaan, bukan jaminan semua variabel wajib digunakan dengan nama persis tersebut. **Periksa implementasi terbaru sebelum membuat `.env`.**

Aturan keamanan:

- Jangan mengunggah `.env` ke Git.
- Jangan menaruh `API_SECRET`, password, atau secret autentikasi dalam variabel `NEXT_PUBLIC_*`.
- Variabel dengan awalan `NEXT_PUBLIC_` dapat masuk ke bundle browser.
- Gunakan kredensial berbeda untuk pengembangan dan produksi.
- Rotasi secret jika pernah terunggah atau dibagikan tanpa sengaja.

## Database dan Prisma

Prisma adalah ORM (Object-Relational Mapper) yang membantu aplikasi membaca dan menulis database menggunakan model yang ditentukan dalam schema. MySQL menyimpan data persisten, sementara Prisma menjadi lapisan akses data dari kode server.

Perintah yang umum digunakan, setelah memastikan konfigurasi dan lingkungan benar:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

Jangan menggunakan `migrate reset` pada database yang berisi data penting. Perintah reset dapat menghapus data.

Untuk produksi:

- Cadangkan database sebelum perubahan skema.
- Tinjau isi migrasi.
- Jalankan migrasi melalui proses deployment yang disetujui.
- Pastikan akun database memiliki hak akses minimum yang dibutuhkan.

## Gambar Produk dan Cloudinary

Cloudinary digunakan untuk mengelola gambar yang diunggah ke sistem. Nama cloud yang tercatat pada lingkungan pengembangan adalah `std3x7lf`, dengan unsigned upload preset `studio_marmer_products`. Konfirmasikan nilai ini pada konfigurasi aktif sebelum penggunaan.

Prinsip pengelolaan media:

- Gunakan gambar yang dimiliki atau memiliki izin penggunaan.
- Gunakan format dan ukuran yang sesuai untuk web.
- Jangan menyimpan secret Cloudinary pada kode klien.
- Operasi penghapusan media harus melewati server dan validasi yang sesuai.
- Setelah mengganti gambar, periksa halaman produk, kartu produk, galeri, dan bagian hero.

**Catatan kompatibilitas URL:** format URL yang valid tidak menjamin host atau path diizinkan oleh Next.js Image maupun Content Security Policy (CSP). Jika gambar gagal muncul, periksa konfigurasi `images.remotePatterns`, CSP, URL, serta log server/browser.

## Pengujian dan Pemeriksaan Kualitas

Skrip yang tercatat digunakan dalam pengembangan mencakup:

- `npm test` untuk suite Vitest.
- `npx eslint .` untuk linting.
- `npx tsc --noEmit` untuk pemeriksaan tipe.
- `npm run verify:forms` untuk pemeriksaan sumber formulir.
- `npm run test:scripts` untuk skrip validasi tambahan.
- Skrip E2E dan browser tertentu yang memerlukan server, database, serta akun admin.

Nama skrip dapat berubah; jalankan `npm run` untuk melihat daftar terbaru.

Sebelum rilis, minimal:

1. Jalankan tes unit.
2. Jalankan ESLint dan pemeriksaan TypeScript.
3. Uji login admin dan otorisasi peran.
4. Uji tambah, edit, dan hapus produk.
5. Uji unggah, ganti, serta penghapusan gambar.
6. Uji halaman di perangkat seluler.
7. Uji tautan eksternal Shopee dan WhatsApp.
8. Jalankan E2E pada lingkungan uji yang benar-benar dikonfigurasi.
9. Periksa log server dan browser.

Jangan menyebut E2E berhasil bila belum benar-benar dijalankan.

## Keamanan dan Pengelolaan Akses

- Gunakan kata sandi admin yang kuat dan unik.
- Berikan peran sesuai kebutuhan tugas.
- Jangan membagikan akun admin melalui dokumen publik.
- Jangan menyimpan secret di repositori.
- Terapkan HTTPS pada deployment produksi.
- Batasi akses database dan layanan media.
- Perbarui dependency dengan peninjauan dan pengujian.
- Simpan backup database dan siapkan prosedur pemulihan.
- Hapus atau nonaktifkan akun yang tidak lagi membutuhkan akses.

## Deployment dan Pemeliharaan

Langkah umum deployment:

1. Siapkan server/hosting yang mendukung versi Node.js dan Next.js proyek.
2. Siapkan database MySQL yang dapat diakses server.
3. Atur seluruh environment variable melalui pengelola secret hosting.
4. Atur domain dan HTTPS.
5. Konfigurasikan Cloudinary dan kebijakan gambar.
6. Jalankan migrasi dengan prosedur produksi yang aman.
7. Jalankan build melalui pipeline deployment.
8. Uji halaman publik, login admin, CRUD, gambar, dan tautan eksternal.
9. Pantau log, performa, error, serta kapasitas penyimpanan.

Pilihan hosting, biaya domain, kapasitas database, backup, dan biaya Cloudinary bergantung pada penyedia dan paket yang dipilih. Dokumen ini tidak menetapkan harga atau menjanjikan layanan hosting tertentu.

## Batasan yang Perlu Diketahui

- Fitur yang tidak tercantum atau belum diuji tidak boleh dianggap tersedia.
- Ketersediaan produk dan harga bergantung pada data yang dimasukkan pengelola.
- Tautan Shopee dan WhatsApp mengarahkan pengguna ke layanan eksternal; ketersediaannya tunduk pada layanan tersebut.
- Pembayaran otomatis, pengiriman, invoice, notifikasi, dan pelacakan pesanan tidak boleh diasumsikan tersedia tanpa implementasi eksplisit.
- Dukungan host gambar dibatasi oleh konfigurasi aplikasi.
- Ketersediaan situs dipengaruhi oleh hosting, database, jaringan, domain, dan layanan media.

## Dokumentasi Pengguna

Panduan untuk pengelola dan admin tersedia di [`DOKUMENTASI_PENGGUNA.md`](./DOKUMENTASI_PENGGUNA.md). Dokumen tersebut menjelaskan akses admin, pengelolaan produk, kategori, galeri, pengaturan situs, serta pemecahan masalah dasar.