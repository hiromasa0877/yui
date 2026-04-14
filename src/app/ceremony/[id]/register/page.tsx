'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { insertAttendeeResilient } from '@/lib/resilient-db';
import { Ceremony, Relation } from '@/types/database';
import { lookupZipcode, normalizeZipcode, validateZipcode } from '@/lib/utils';
import toast from 'react-hot-toast';

const RELATIONS: Relation[] = ['親族', '友人', '会社関係', '近所', 'その他'];

export default function AttendeeRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const ceremonyId = params.id as string;

  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    postal_code: '',
    address: '',
    relation: '' as Relation | '',
  });

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

  const handlePostalCodeChange = async (value: string) => {
    const cleaned = normalizeZipcode(value);
    setFormData({ ...formData, postal_code: cleaned });

    if (validateZipcode(cleaned)) {
      try {
        setLookupLoading(true);
        const address = await lookupZipcode(cleaned);
        if (address) {
          setFormData((prev) => ({ ...prev, address }));
        }
      } catch (error) {
        console.error('Zipcode lookup error:', error);
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.postal_code) {
      toast.error('氏名と郵便番号は必須です');
      return;
    }

    if (!validateZipcode(formData.postal_code)) {
      toast.error('郵便番号の形式が正しくありません');
      return;
    }

    try {
      setSubmitting(true);

      const clientRef = `self-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await insertAttendeeResilient(
        ceremonyId,
        {
          full_name: formData.full_name,
          postal_code: formData.postal_code,
          address: formData.address,
          relation: formData.relation || null,
          check_in_method: 'smart',
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        },
        clientRef
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      if (result.queued) {
        // オフライン退避: データは守られているのでユーザー通知して完了扱い
        toast.success(
          'オフラインで登録を保存しました。電波が戻り次第、自動送信します。'
        );
        router.push(`/ceremony/${ceremonyId}/complete?queued=1`);
      } else {
        toast.success('参列登録が完了しました');
        router.push(
          `/ceremony/${ceremonyId}/complete?attendeeId=${result.data.id}`
        );
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      const msg =
        error instanceof Error ? error.message : '参列登録に失敗しました';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-accent-cream flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!ceremony) {
    return (
      <div className="min-h-screen bg-accent-cream">
        <Header showLogo={true} />
        <main className="max-w-md mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            式典が見つかりません
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent-cream">
      <Header backButton={true} />

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="card animate-scale-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-accent-dark">
              {ceremony.name}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              故人: {ceremony.deceased_name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-accent-dark mb-2">
                氏名 *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="例: 山田花子"
                className="input-base"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-accent-dark mb-2">
                郵便番号 *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.postal_code}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                placeholder="1234567（ハイフン不要）"
                className="input-base text-lg py-4 tracking-wider"
                maxLength={8}
                required
              />
              {lookupLoading && (
                <p className="text-sm text-gray-500 mt-1">住所を検索中...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-accent-dark mb-2">
                住所
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="郵便番号から自動入力されます"
                rows={3}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-accent-dark mb-2">
                ご関係（任意）
              </label>
              <select
                value={formData.relation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relation: e.target.value as Relation | '',
                  })
                }
                className="input-base"
              >
                <option value="">選択してください</option>
                {RELATIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary disabled:opacity-50"
            >
              {submitting ? '送信中...' : '参列登録を完了'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
