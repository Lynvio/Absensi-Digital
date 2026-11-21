import React, { useEffect, useState } from 'react';
import type { SesiTersimpan } from '@/tipe/Pengguna';
import {
  ambilPengajuanKehadiran,
  buatPengajuanKehadiran,
  tinjauPengajuanKehadiran,
  type PengajuanKehadiran,
} from '@/layanan/LayananPersetujuan';
import { dapatkanTanggalHariIni } from '@/utilitas/Tanggal';
import { Check, ClipboardList, Send, X } from 'lucide-react';
import Swal from 'sweetalert2';

interface PropertiPengajuanKehadiran {
  sesi: SesiTersimpan;
  setMemuat: (memuat: boolean) => void;
}

const LABEL_STATUS: Record<string, string> = {
  pending_teacher: 'Menunggu guru/wali kelas',
  pending_waka: 'Menunggu waka',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const HalamanPengajuanKehadiran: React.FC<PropertiPengajuanKehadiran> = ({ sesi, setMemuat }) => {
  const [rows, setRows] = useState<PengajuanKehadiran[]>([]);
  const [type, setType] = useState<PengajuanKehadiran['type']>('izin');
  const [date, setDate] = useState(dapatkanTanggalHariIni());
  const [reason, setReason] = useState('');
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});

  const reviewer = ['admin', 'guru', 'wali_kelas', 'waka', 'wakel'].includes(sesi.role);

  const load = async () => {
    setMemuat(true);
    try {
      const result = await ambilPengajuanKehadiran();
      if (result.success) setRows(result.data || []);
      else throw new Error(result.message || 'Pengajuan tidak dapat dimuat.');
    } catch (error) {
      Swal.fire('Gagal', error instanceof Error ? error.message : 'Pengajuan tidak dapat dimuat.', 'error');
    } finally {
      setMemuat(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return Swal.fire('Perhatian', 'Alasan wajib diisi.', 'warning');
    setMemuat(true);
    try {
      const result = await buatPengajuanKehadiran({ type, date, reason: reason.trim() });
      if (!result.success) throw new Error(result.message || 'Pengajuan gagal dikirim.');
      setReason('');
      await load();
      Swal.fire('Terkirim', 'Pengajuan berhasil dikirim.', 'success');
    } catch (error) {
      Swal.fire('Gagal', error instanceof Error ? error.message : 'Pengajuan gagal dikirim.', 'error');
    } finally {
      setMemuat(false);
    }
  };

  const review = async (row: PengajuanKehadiran, decision: 'approve' | 'reject' | 'escalate') => {
    setMemuat(true);
    try {
      const result = await tinjauPengajuanKehadiran(row.id, decision, decisionNote[row.id] || '');
      if (!result.success) throw new Error(result.message || 'Keputusan gagal disimpan.');
      await load();
    } catch (error) {
      Swal.fire('Gagal', error instanceof Error ? error.message : 'Keputusan gagal disimpan.', 'error');
    } finally {
      setMemuat(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="kartu-modern p-5">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Workflow kehadiran</p>
        <h1 className="text-2xl font-black text-slate-900 mt-1">Pengajuan & Persetujuan</h1>
        <p className="text-sm text-slate-600 mt-2">Setiap perubahan presensi diproses dengan status, actor, waktu, dan catatan.</p>
      </header>

      {sesi.role === 'siswa' && (
        <form onSubmit={submit} className="kartu-modern p-5 space-y-4">
          <h2 className="font-black text-slate-900 flex items-center gap-2"><Send className="w-5 h-5 text-indigo-600" /> Ajukan izin, sakit, atau koreksi</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select aria-label="Jenis pengajuan" value={type} onChange={(e) => setType(e.target.value as PengajuanKehadiran['type'])} className="rounded-xl border p-3 text-sm">
              <option value="izin">Izin</option><option value="sakit">Sakit</option><option value="koreksi">Koreksi presensi</option>
            </select>
            <input aria-label="Tanggal pengajuan" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border p-3 text-sm" required />
            <input aria-label="Alasan pengajuan" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pengajuan" className="rounded-xl border p-3 text-sm md:col-span-1" required maxLength={1000} />
          </div>
          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">Kirim Pengajuan</button>
        </form>
      )}

      <section className="kartu-modern p-5">
        <h2 className="font-black text-slate-900 flex items-center gap-2 mb-4"><ClipboardList className="w-5 h-5 text-indigo-600" /> Daftar Pengajuan</h2>
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada pengajuan.</p>}
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div><p className="font-black text-slate-900">{row.nama} · {row.type}</p><p className="text-xs text-slate-500">{row.date} · Kelas {row.kelas}</p></div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{LABEL_STATUS[row.status] || row.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{row.reason}</p>
              {reviewer && row.status !== 'approved' && row.status !== 'rejected' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input aria-label={`Catatan keputusan ${row.id}`} value={decisionNote[row.id] || ''} onChange={(e) => setDecisionNote((p) => ({ ...p, [row.id]: e.target.value }))} placeholder="Catatan keputusan" className="min-w-[220px] flex-1 rounded-xl border p-2 text-sm" />
                  <button type="button" onClick={() => void review(row, 'approve')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="inline w-4 h-4" /> Setujui</button>
                  {(row.status === 'pending_teacher' && (sesi.role === 'guru' || sesi.role === 'wali_kelas')) && <button type="button" onClick={() => void review(row, 'escalate')} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white">Eskalasi</button>}
                  <button type="button" onClick={() => void review(row, 'reject')} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"><X className="inline w-4 h-4" /> Tolak</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
