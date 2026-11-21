import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function daftarBerkas(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entri) => {
    const path = join(folder, entri.name);
    if (entri.isDirectory()) return daftarBerkas(path);
    return /\.(ts|tsx|css|html)$/.test(entri.name) ? [path] : [];
  });
}

describe('Verifikasi antarmuka publik', () => {
  it('memberi tipe eksplisit pada semua tombol agar tidak terkirim sebagai submit tanpa sengaja', () => {
    const berkas = daftarBerkas(join(ROOT, 'src')).filter((path) => path.endsWith('.tsx'));
    const tanpaTipe: string[] = [];

    for (const path of berkas) {
      const sumber = readFileSync(path, 'utf8');
      const ast = ts.createSourceFile(path, sumber, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const periksa = (node: ts.Node) => {
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          node.tagName.getText(ast) === 'button' &&
          !node.attributes.properties.some(
            (atribut) => ts.isJsxAttribute(atribut) && atribut.name.getText(ast) === 'type'
          )
        ) {
          const baris = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
          tanpaTipe.push(`${path}:${baris}`);
        }
        ts.forEachChild(node, periksa);
      };

      periksa(ast);
    }

    expect(tanpaTipe).toEqual([]);
  });

  it('menghubungkan label dengan kolom masuk pada halaman login', () => {
    const login = readFileSync(join(ROOT, 'src', 'halaman', 'Login.tsx'), 'utf8');

    expect(login).toContain('htmlFor="nisn-siswa"');
    expect(login).toContain('id="nisn-siswa"');
    expect(login).toContain('htmlFor="pin-siswa"');
    expect(login).toContain('id="pin-siswa"');
    expect(login).toContain('htmlFor="username-pengajar"');
    expect(login).toContain('id="username-pengajar"');
    expect(login).toContain('htmlFor="password-pengajar"');
    expect(login).toContain('id="password-pengajar"');
  });

  it('membaca impor Excel sebagai ArrayBuffer pada seluruh halaman terkait', () => {
    const halamanImpor = ['DataGuru.vue', 'DataSiswa.tsx', 'Pengaturan.tsx'];

    for (const namaBerkas of halamanImpor) {
      const sumber = readFileSync(join(ROOT, 'src', 'halaman', namaBerkas), 'utf8');

      expect(sumber, namaBerkas).toContain('readAsArrayBuffer(file)');
      expect(sumber, namaBerkas).toMatch(/XLSX\.read\([^;]*\{\s*type:\s*'array'\s*\}\)/s);
      expect(sumber, namaBerkas).not.toContain('readAsBinaryString');
    }
  });

  it('memberi nama aksesibel pada setiap kolom yang terlihat', () => {
    const berkas = daftarBerkas(join(ROOT, 'src')).filter((path) => path.endsWith('.tsx'));
    const labelUntukId = new Set<string>();
    const masalah: string[] = [];
    const pohon = berkas.map((path) => {
      const sumber = readFileSync(path, 'utf8');
      return {
        path,
        ast: ts.createSourceFile(path, sumber, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
      };
    });
    const nilaiReferensi = (
      atribut: ts.JsxAttributeLike | undefined,
      ast: ts.SourceFile
    ): string | undefined => {
      if (!atribut || !ts.isJsxAttribute(atribut)) return undefined;
      const nilai = atribut.initializer;
      if (nilai && ts.isStringLiteral(nilai)) return `literal:${nilai.text}`;
      if (nilai && ts.isJsxExpression(nilai) && nilai.expression) {
        return `ekspresi:${nilai.expression.getText(ast)}`;
      }
      return undefined;
    };

    for (const { ast } of pohon) {
      const kumpulkanLabel = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === 'label') {
          const htmlFor = node.attributes.properties.find(
            (atribut) => ts.isJsxAttribute(atribut) && atribut.name.getText(ast) === 'htmlFor'
          );
          const referensi = nilaiReferensi(htmlFor, ast);
          if (referensi) labelUntukId.add(referensi);
        }
        ts.forEachChild(node, kumpulkanLabel);
      };
      kumpulkanLabel(ast);
    }

    for (const { path, ast } of pohon) {
      const periksaKontrol = (node: ts.Node, leluhur: ts.Node[] = []) => {
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          ['input', 'select', 'textarea'].includes(node.tagName.getText(ast))
        ) {
          const atribut = node.attributes.properties;
          const ambilAtribut = (nama: string): ts.JsxAttribute | undefined => {
            const item = atribut.find(
              (kandidat): kandidat is ts.JsxAttribute =>
                ts.isJsxAttribute(kandidat) && kandidat.name.getText(ast) === nama
            );
            return item;
          };
          const tipe = ambilAtribut('type')?.initializer;
          const kelas = ambilAtribut('className')?.initializer;
          const fileTersembunyi =
            tipe && ts.isStringLiteral(tipe) && tipe.text === 'file';
          const kelasTersembunyi =
            kelas && ts.isStringLiteral(kelas) && kelas.text.split(/\s+/).includes('hidden');
          const idReferensi = nilaiReferensi(ambilAtribut('id'), ast);
          const beradaDalamLabel = leluhur.some(
            (parent) => ts.isJsxElement(parent) && parent.openingElement.tagName.getText(ast) === 'label'
          );
          const memilikiLabel =
            (idReferensi && labelUntukId.has(idReferensi)) ||
            ambilAtribut('aria-label') ||
            ambilAtribut('aria-labelledby');

          if (!fileTersembunyi && !kelasTersembunyi && !beradaDalamLabel && !memilikiLabel) {
            const baris = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
            masalah.push(`${path}:${baris}`);
          }
        }
        ts.forEachChild(node, (child) => periksaKontrol(child, [...leluhur, node]));
      };
      periksaKontrol(ast);
    }

    expect(masalah).toEqual([]);
  });

  it('memberi semantik dialog dan dukungan keyboard pada modal aplikasi', () => {
    const berkasDialog = [
      join(ROOT, 'src', 'halaman', 'Dashboard.tsx'),
      join(ROOT, 'src', 'halaman', 'DataGuru.tsx'),
      join(ROOT, 'src', 'halaman', 'DataGuru.vue'),
      join(ROOT, 'src', 'halaman', 'DataSiswa.tsx'),
      join(ROOT, 'src', 'komponen', 'tata-letak', 'KepalaHalaman.tsx'),
    ];
    const sumber = berkasDialog.map((path) => readFileSync(path, 'utf8')).join('\n');
    const hook = readFileSync(join(ROOT, 'src', 'utilitas', 'useAksesibilitasDialog.ts'), 'utf8');

    expect(sumber.match(/role="dialog"/g)).toHaveLength(6);
    expect(sumber.match(/aria-modal="true"/g)).toHaveLength(6);
    expect(hook).toContain("event.key === 'Escape'");
    expect(hook).toContain("event.key !== 'Tab'");
    expect(hook).toContain('fokusAwal.focus()');
  });

  it('menetapkan teks kecil standar minimal 14 piksel dan target tombol 44 piksel', () => {
    const konfigurasi = readFileSync(join(ROOT, 'tailwind.config.js'), 'utf8');
    const css = readFileSync(join(ROOT, 'src', 'gaya', 'utama.css'), 'utf8');

    expect(konfigurasi).toContain("xs: ['0.875rem'");
    expect(css).toContain('min-height: 2.75rem');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('menghapus seluruh mekanisme dan gaya dark mode dari aplikasi', () => {
    const berkas = [
      ...daftarBerkas(join(ROOT, 'src')),
      join(ROOT, 'tailwind.config.js'),
    ];
    const sumber = berkas.map((path) => readFileSync(path, 'utf8')).join('\n');

    expect(sumber).not.toMatch(/(?:^|[\s"'`])dark:[^\s"'`]+|html\.dark|:root\.dark|prefers-color-scheme|temaApp|ubahTema|darkMode/);
  });

  it('menggunakan background login berbintik tanpa gradient lain', () => {
    const css = readFileSync(join(ROOT, 'src', 'gaya', 'utama.css'), 'utf8');
    const login = readFileSync(join(ROOT, 'src', 'halaman', 'Login.tsx'), 'utf8');
    const aturanBackground = css.match(/\.background\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(aturanBackground).toContain('background-color: #0B1222');
    expect(aturanBackground).toContain('rgba(100, 125, 160, 0.30)');
    expect(aturanBackground).toContain('background-size: 24px 24px');
    expect(aturanBackground).toContain('background-position: 13px 5px');
    expect(login).not.toMatch(/linear-gradient|bg-gradient|animasi-float/);
    expect(login).toContain('Tampilkan gambar latar');
    expect(login).toContain('Jeda pergantian gambar');
  });

  it('menghapus fitur consent dan dokumen kebijakan yang ditambahkan sebelumnya', () => {
    const app = readFileSync(join(ROOT, 'src', 'aplikasi', 'App.tsx'), 'utf8');
    const berkas = [
      ...daftarBerkas(join(ROOT, 'src')),
      join(ROOT, 'README.md'),
    ];
    const sumber = berkas.map((path) => readFileSync(path, 'utf8')).join('\n');

    expect(existsSync(join(ROOT, 'src', 'komponen', 'umum', 'CookieConsent.tsx'))).toBe(false);
    expect(existsSync(join(ROOT, 'src', 'utilitas', 'Privasi.ts'))).toBe(false);
    expect(existsSync(join(ROOT, 'public', 'cookie-policy.html'))).toBe(false);
    expect(existsSync(join(ROOT, 'public', 'privacy-policy.html'))).toBe(false);
    expect(sumber).not.toMatch(/<CookieConsent|privacy-policy|cookie-policy|Your privacy matters|Cookie consent|Privacy settings/i);
    expect(app).toContain("localStorage.removeItem('absensiCookieConsent')");
  });
});
