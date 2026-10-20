#!/usr/bin/env – tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '@/lib/db/password';

// === 1. Muat .env secara eksplisit ===
// dotenv/config akan mengisi process.env dari file .env di root repository.

// === 2. Parse DATABASE_URL dan validasi hostname ===
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not set in environment');
  process.exit(1);
}

const url = new URL(dbUrl);

console.log(`Reset password target database host: ${url.hostname}`);

const isProductionTarget =
  process.env.NODE_ENV === 'production' || url.hostname.includes('dockhosting.dev');

if (isProductionTarget && process.env.ALLOW_PROD_SCRIPT !== 'yes') {
  console.error(
    'Reset password dibatalkan: target terdeteksi production. Set ALLOW_PROD_SCRIPT=yes untuk melanjutkan dengan sadar.'
  );
  process.exit(1);
}

if (url.hostname !== 'studio-marmer.db.dockhosting.dev') {
  console.error(
    '❌ DATABASE_URL hostname must be studio-marmer.db.dockhosting.dev'
  );
  process.exit(1);
}

// === 3. Buat Prisma Client ===
// PrismaClient akan menggunakan DATABASE_URL dari env (yang sudah di-load dotenv).
const prisma = new PrismaClient();

// === 6. Cek akun admin sebelum meminta password ===
const user = await prisma.user.findUnique({
  where: { email: 'admin@marble.test' },
});

if (!user) {
  console.error('❌ Akun admin admin@marble.test tidak ditemukan di database');
  await prisma.$disconnect();
  process.exit(1);
}

// === 4. Input password tersembunyi yang teruji di Windows PowerShell ===
// Menggunakan raw mode stdin. Jika stdin bukan TTY (bukan interaktif),
// hentikan skrip dengan pesan jelas — jangan pernah bolak-balik ke input teks biasa.

async function bacaPasswordTersembunyi(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(
        new Error('stdin is not a TTY — hidden password not available in this environment')
      );
      return;
    }

    const chars: string[] = [];

    try {
      process.stdin.setRawMode(true);
    } catch {
      reject(new Error('Gagal mengaktifkan raw mode stdin'));
      return;
    }

    process.stdin.resume();

    process.stdin.on('data', (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 13) {
          // Enter ditekan — simpan password dan tutup
          process.stdin.setRawMode(false);
          resolve(chars.join(''));
        } else if (byte === 127 || byte === 8) {
          // Backspace
          if (chars.length > 0) {
            chars.pop();
            // Hapus asterisk terakhir dari terminal
            process.stdout.write('\b \b');
          }
        } else if (byte >= 32 && byte < 127) {
          // Karakter printable — simpan dan tampilkan asterisk
          chars.push(String.fromCharCode(byte));
          process.stdout.write('*');
        }
      }
    });

    // Tampilkan prompt setelah listener terdaftar
    process.stdout.write('Masukkan password admin: ');
  });
}

let passwordBaru: string;
try {
  passwordBaru = await bacaPasswordTersembunyi();
} catch (err) {
  console.error('❌ Gagal membaca password tersembunyi:', (err as Error).message);
  await prisma.$disconnect();
  process.exit(1);
}

// === 5. Gunakan hashPassword dan verifyPassword dari lib/db/password.ts ===
const hashBaru = await hashPassword(passwordBaru);

// === 7. Verifikasi hash baru sebelum update database ===
const verifikasi = await verifyPassword(passwordBaru, hashBaru);
if (!verifikasi) {
  console.error('❌ Verifikasi password hash gagal');
  await prisma.$disconnect();
  process.exit(1);
}

// === 8. Bungkus operasi database di try/finally; update hanya passwordHash ===
try {
  await prisma.user.update({
    where: { email: 'admin@marble.test' },
    data: { passwordHash: hashBaru },
  });
} finally {
  await prisma.$disconnect();
}

// === 9. Tidak mencetak password, hash, atau DATABASE_URL ===
// (Tidak ada console.log yang menampilkannya di atas)
console.log('✅ Password admin berhasil direset. Akun tetap memiliki role ADMIN.');