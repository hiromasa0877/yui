'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Attendee } from '@/types/database';
import { formatKodenNumber } from '@/lib/utils';

export default function AttendeeCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attendeeId = searchParams.get('attendeeId');
  const queued = searchParams.get('queued') === '1';

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(!queued);

  useEffect(() => {
    if (queued) {
      // オフライン登録: IndexedDBに保存済み。attendee取得はスキップ
      activateWakeLock();
      return;
    }
    if (!attendeeId) {
      router.push('/');
      return;
    }

    fetchAttendee();
    activateWakeLock();
  }, [attendeeId, queued]);

  const fetchAttendee = async () => {
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', attendeeId)
        .single();

      if (error) throw error;
      setAttendee(data);
    } catch (error) {
      console.error('Error fetching attendee:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        await (navigator.wakeLock as any).request('screen');
      }
    } catch (error) {
      console.error('Wake lock error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-accent-cream flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold"></div>
        </div>
      </div>
    );
  }

  if (queued) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-dark via-accent-cream to-accent-gold flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="card animate-scale-up">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center text-4xl">
                💾
              </div>
            </div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-accent-dark mb-2">
                オフラインで登録しました
              </h1>
              <p className="text-gray-600">
                電波が戻り次第、自動で送信されます
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-700 leading-relaxed">
                ご入力いただいた情報はこの端末に安全に保存されています。
                管理番号は電波復帰後に自動で採番されますので、
                スタッフまでお声がけください。
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full btn-primary"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="min-h-screen bg-accent-cream flex items-center justify-center">
        <div className="text-center text-gray-600">
          参列者情報が見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-dark via-accent-cream to-accent-gold flex flex-col items-center justify-center p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-gold opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-teal opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="card animate-scale-up">
          {/* Checkmark Animation */}
          <div className="flex justify-center mb-8">
            <div className="animate-checkmark w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Completion Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-accent-dark mb-2">
              参列登録完了
            </h1>
            <p className="text-gray-600">
              ご参列ありがとうございます
            </p>
          </div>

          {/* Attendee Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">参列者名</p>
              <h2 className="text-2xl font-bold text-accent-dark mb-6">
                {attendee.full_name}
              </h2>

              <p className="text-sm text-gray-600 mb-2">管理番号</p>
              <p className="font-mono text-5xl font-bold text-accent-gold mb-2 tracking-wider">
                {formatKodenNumber(attendee.koden_number)}
              </p>
              <p className="text-xs text-gray-500 mb-8">
                この番号を香典袋にご記入ください
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-accent-teal bg-opacity-10 border-l-4 border-accent-teal rounded-lg p-4 mb-8">
            <p className="text-center font-semibold text-accent-dark">
              上記の管理番号を香典袋にご記入の上、<br />
              受付にお持ちください
            </p>
          </div>

          {/* Return Button */}
          <button
            onClick={() => router.push('/')}
            className="w-full btn-primary"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
