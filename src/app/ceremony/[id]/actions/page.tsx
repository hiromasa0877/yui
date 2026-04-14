'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Ceremony } from '@/types/database';
import toast from 'react-hot-toast';

export default function CeremonyActionsPage() {
  const router = useRouter();
  const params = useParams();
  const ceremonyId = params.id as string;

  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCeremony();
  }, [ceremonyId]);

  const fetchCeremony = async () => {
    try {
      const { data, error } = await supabase
        .from('ceremonies')
        .select('*')
        .eq('id', ceremonyId)
        .single();

      if (error) throw error;
      setCeremony(data);
    } catch (error) {
      console.error('Error fetching ceremony:', error);
      toast.error('式典が見つかりません');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-accent-cream flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold" />
      </div>
    );
  }

  if (!ceremony) return null;

  return (
    <div className="min-h-screen bg-accent-cream">
      <Header backButton={true} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Ceremony summary — larger type for elderly legibility */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-accent-dark mb-3 leading-tight">
            {ceremony.name}
          </h1>
          <p className="text-base sm:text-lg text-gray-700">
            故人: {ceremony.deceased_name}
          </p>
          <p className="text-base sm:text-lg text-gray-700">
            会場: {ceremony.venue}
          </p>
          <p className="text-sm sm:text-base text-gray-500 mt-2">
            {new Date(ceremony.ceremony_date).toLocaleString('ja-JP')}
          </p>
        </div>

        {/* Section label so elderly users immediately understand the choice */}
        <p className="text-center text-lg sm:text-xl font-semibold text-accent-dark mb-5 sm:mb-6">
          登録方法をお選びください
        </p>

        {/*
          Action cards — designed for elderly users:
          - Both cards use soft, harmonized tints (no harsh white/saturated contrast)
          - A thick colored top bar identifies each option at a glance
          - Icons, titles, and descriptions are all sized up vs default
          - Grid stacks on mobile (< sm) and becomes 2 columns from sm (≈ tablet) upward
          - Touch target min-height is generous even for cold / shaky hands in winter
          - Inline styles guarantee specificity over any global .card rules
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 mb-10">
          {/* Option A: self-register */}
          <Link
            href={`/ceremony/${ceremony.id}/register`}
            aria-label="ご自身で登録する"
            className="group block rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-gold/50"
            style={{ backgroundColor: '#fdfaf0', color: '#1a1a2e' }}
          >
            {/* Top color bar to identify this option */}
            <div style={{ height: '8px', backgroundColor: '#c9a962' }} />
            <div className="px-6 sm:px-8 py-10 sm:py-14 text-center min-h-[240px] sm:min-h-[280px] flex flex-col items-center justify-center">
              <div
                className="text-7xl sm:text-8xl mb-5 transition-transform group-hover:scale-110"
                aria-hidden="true"
              >
                📱
              </div>
              <div
                className="text-2xl sm:text-3xl font-bold mb-3"
                style={{ color: '#1a1a2e' }}
              >
                ご自身で登録
              </div>
              <p
                className="text-base sm:text-lg leading-relaxed"
                style={{ color: '#4a4a5c' }}
              >
                参列される方ご自身が
                <br className="sm:hidden" />
                スマホから登録します
              </p>
            </div>
          </Link>

          {/* Option B: proxy register (staff fills in for the attendee) */}
          <Link
            href={`/staff/${ceremony.id}`}
            aria-label="スタッフが代理で登録する"
            className="group block rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-teal/50"
            style={{ backgroundColor: '#eef4f5', color: '#1a1a2e' }}
          >
            {/* Top color bar to identify this option */}
            <div style={{ height: '8px', backgroundColor: '#3a7c8c' }} />
            <div className="px-6 sm:px-8 py-10 sm:py-14 text-center min-h-[240px] sm:min-h-[280px] flex flex-col items-center justify-center">
              <div
                className="text-7xl sm:text-8xl mb-5 transition-transform group-hover:scale-110"
                aria-hidden="true"
              >
                ✍️
              </div>
              <div
                className="text-2xl sm:text-3xl font-bold mb-3"
                style={{ color: '#1a1a2e' }}
              >
                代理登録
              </div>
              <p
                className="text-base sm:text-lg leading-relaxed"
                style={{ color: '#4a4a5c' }}
              >
                スタッフが参列者に
                <br className="sm:hidden" />
                代わって入力します
              </p>
            </div>
          </Link>
        </div>

        {/* De-emphasized dashboard link for funeral company staff */}
        <div className="text-center">
          <Link
            href={`/dashboard/${ceremony.id}`}
            className="inline-flex items-center gap-1 text-sm sm:text-base text-gray-500 hover:text-accent-gold transition-colors underline underline-offset-4"
          >
            葬儀会社向けダッシュボードを開く →
          </Link>
        </div>
      </main>
    </div>
  );
}
