import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function baca(path: string): string {
  const penuh = join(ROOT, path);
  expect(existsSync(penuh), `Berkas Astro wajib tersedia: ${path}`).toBe(true);
  return readFileSync(penuh, 'utf8');
}

describe('Shell migrasi Astro bertahap', () => {
  it('menyediakan halaman Astro statis dengan metadata dokumen yang dipertahankan', () => {
    const halaman = baca('src/pages/index.astro');
    const tataLetak = baca('src/layouts/TataLetakUtama.astro');

    expect(halaman).toContain('client:only="react"');
    expect(halaman).toContain('slot="fallback"');
    expect(tataLetak).toContain('<html lang="id">');
    expect(tataLetak).toMatch(/<title>E-Absensi (SMKN 3 OKU|Digital Sekolah)<\/title>/);
    expect(tataLetak).toContain('name="description"');
    expect(tataLetak).toContain('rel="canonical"');
  });

  it('mempertahankan aset konfigurasi, proteksi browser, reCAPTCHA, dan gaya global', () => {
    const tataLetak = baca('src/layouts/TataLetakUtama.astro');

    expect(tataLetak).toContain('/config.js');
    expect(tataLetak).toContain('/security/protect.js');
    expect(tataLetak).toContain('recaptcha/api.js?render=');
    expect(tataLetak).toContain('../gaya/utama.css');
  });

  it('mengonfigurasi Astro dengan integrasi React dan Vue untuk build statis', () => {
    const konfigurasi = baca('astro.config.mjs');

    expect(konfigurasi).toMatch(/output:\s*['"]static['"]/);
    expect(konfigurasi).toContain('@astrojs/react');
    expect(konfigurasi).toContain('@astrojs/vue');
  });

  it('membangun aplikasi menggunakan pemeriksaan tipe dan Astro', () => {
    const paket = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(paket.scripts.build).toContain('scripts/build.mjs');
    expect(baca('scripts/build.mjs')).toContain('vue-tsc --noEmit');
    expect(baca('scripts/build.mjs')).toContain('astro check');
    expect(baca('scripts/build.mjs')).toContain('astro build');
  });

  it('menggunakan Astro sebagai satu-satunya sumber dokumen root', () => {
    expect(existsSync(join(ROOT, 'src/pages/index.astro'))).toBe(true);
    expect(existsSync(join(ROOT, 'index.html'))).toBe(false);
    expect(baca('.gitignore')).toMatch(/^\/\.astro\/\s*$/m);
  });

  it('menargetkan Cloudflare Pages dengan output Astro statis dan header keamanan', () => {
    const konfigurasiCloudflare = baca('wrangler.toml');
    const headerCloudflare = baca('public/_headers');

    expect(konfigurasiCloudflare).toContain('pages_build_output_dir = "./dist"');
    expect(konfigurasiCloudflare).toMatch(/compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/);
    expect(headerCloudflare).toContain('X-Content-Type-Options: nosniff');
    expect(headerCloudflare).toMatch(/\/config\.js\s+Cache-Control: no-store, max-age=0/);
  });

  it('hanya memberi cache immutable pada aset Astro ber-hash dan tidak mewariskan HSTS ke subdomain', () => {
    const headerCloudflare = baca('public/_headers');
    const konfigurasiVercel = JSON.parse(baca('vercel.json')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const headerUntuk = (source: string, key: string): string | undefined =>
      konfigurasiVercel.headers
        .find((aturan) => aturan.source === source)
        ?.headers.find((header) => header.key === key)?.value;

    expect(headerCloudflare).toMatch(/\/\s+Cache-Control: no-store, max-age=0/);
    expect(headerCloudflare).toMatch(
      /\/assets\/\*\s+Cache-Control: public, max-age=0, must-revalidate/,
    );
    expect(headerCloudflare).toMatch(
      /\/_astro\/\*\s+Cache-Control: public, max-age=31536000, immutable/,
    );
    expect(headerCloudflare).toMatch(
      /Strict-Transport-Security: max-age=31536000(?:\r?\n|$)/,
    );
    expect(headerCloudflare).not.toContain('includeSubDomains');
    expect(headerUntuk('/', 'Cache-Control')).toBe('no-store, max-age=0');
    expect(headerUntuk('/assets/(.*)', 'Cache-Control')).toBe(
      'public, max-age=0, must-revalidate',
    );
    expect(headerUntuk('/_astro/(.*)', 'Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(headerUntuk('/(.*)', 'Strict-Transport-Security')).toBe('max-age=31536000');
  });

  it('tidak menyimpan konfigurasi build Vite lama di samping Astro', () => {
    const paket = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    const konfigurasiAplikasi = baca('tsconfig.json');
    const konfigurasiTes = baca('vitest.config.ts');

    expect(existsSync(join(ROOT, 'vite.config.ts'))).toBe(false);
    expect(paket.devDependencies['@vitejs/plugin-react']).toBeUndefined();
    expect(existsSync(join(ROOT, 'tsconfig.node.json'))).toBe(false);
    expect(konfigurasiAplikasi).not.toMatch(/"references"\s*:\s*\[\s*\{\s*"path":\s*"\.\/tsconfig\.node\.json"/);
    expect(konfigurasiTes).toContain("@vitejs/plugin-vue");
  });
});
