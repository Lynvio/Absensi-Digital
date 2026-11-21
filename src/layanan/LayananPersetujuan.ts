import { panggilApi } from './KlienApi';
import type { ResponApi } from '@/tipe/Konfigurasi';

export interface PengajuanKehadiran {
  id: string;
  type: 'izin' | 'sakit' | 'koreksi';
  date: string;
  nisn: string;
  nama: string;
  kelas: string;
  reason: string;
  evidence?: string;
  status: string;
  createdAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export function buatPengajuanKehadiran(data: {
  type: PengajuanKehadiran['type'];
  date: string;
  reason: string;
  evidence?: string;
}): Promise<ResponApi<{ id: string; status: string }>> {
  return panggilApi('createAttendanceRequest', [data]);
}

export function ambilPengajuanKehadiran(status?: string): Promise<ResponApi<PengajuanKehadiran[]>> {
  return panggilApi('getAttendanceRequests', [status || '']);
}

export function tinjauPengajuanKehadiran(
  id: string,
  decision: 'approve' | 'reject' | 'escalate',
  note: string
): Promise<ResponApi<{ status: string }>> {
  return panggilApi('reviewAttendanceRequest', [id, decision, note]);
}

export function ambilNotifikasi(unreadOnly = false): Promise<ResponApi<Array<{
  id: string;
  title: string;
  message: string;
  referenceId: string;
  readAt?: string;
  createdAt?: string;
}>>> {
  return panggilApi('getNotifications', [unreadOnly]);
}

export function tandaiNotifikasiDibaca(id: string): Promise<ResponApi> {
  return panggilApi('markNotificationRead', [id]);
}
