'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import KodenInput from '@/components/KodenInput';
import { supabase } from '@/lib/supabase';
import { insertAttendeeResilient } from '@/lib/resilient-db';
import { Ceremony } from '@/types/database';
import {
  formatKodenNumber,
  lookupZipcode,
  normalizeZipcode,
  validateZipcode,
} from '@/lib/utils';
import toast from 'react-hot-toast';

type ConciergeForm = {
  full_name: string;
  postal_code: string;
  address: string;
  relation: string;
  koden_amount: number | null;
  has_kuge: boolean;
  has_kumotsu: boolean;
  has_chouden: boolean;
  has_other_offering: boolean;
};

const emptyForm: ConciergeForm = {
  full_name: '',
  postal_code: '',
  address: '',
  relation: '',
  koden_amount: null,
  has_kuge: false,
  has_kumotsu: false,
  has_chouden: false,
  has_other_offering: false,
};

export default function StaffPage() {
  const params = useParams();
  const ceremonyId = params.ceremonyId as string;

  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [conciergeForm, setConciergeForm] = useState<ConciergeForm>(emptyForm);
  const [conciergeLookupLoading, setConciergeLookupLoading] = useState(false);
  const [submittingConcierge, setSubmittingConcierge] = useState(false);
  // Bump key to force KodenInput to reset after each successful submit.
  const [kodenResetKey, setKodenResetKey] = useState(0);

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
    }
  };

  const handleConciergePostal = async (value: string) => {
    // Always strip hyphens/spaces so the value stored is just digits.
    const cleaned = normalizeZipcode(value);
    setConciergeForm((prev) => ({ ...prev, postal_code: cleaned }));

    if (validateZipcode(cleaned)) {
      try {
        setConciergeLookupLoading(true);
        const address = await lookupZipcode(cleaned);
        if (address) {
          setConciergeForm((prev) => ({ ...prev, address }));
        }
      } finally {
        setConciergeLookupLoading(false);
      }
    }
  };

  const handleConciergSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!conciergeForm.full_name) {
      toast.error('氏名は必須です');
      return;
    }

    try {
      setSubmittingConcierge(true);

      const clientRef = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await insertAttendeeResilient(
        ceremonyId,
        {
          full_name: conciergeForm.full_name,
          postal_code: conciergeForm.postal_code || null,
          address: conciergeForm.address || null,
          relation: conciergeForm.relation || null,
          koden_amount: conciergeForm.koden_amount,
          has_kuge: conciergeForm.has_kuge,
          has_kumotsu: conciergeForm.has_kumotsu,
          has_chouden: conciergeForm.has_chouden,
          has_other_offering: conciergeForm.has_other_offering,
          checked_in: true,
          check_in_method: 'concierge',
          checked_in_at: new Date().toISOString(),
        },
        clientRef
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      if (result.queued) {
        // オフライン退避: 管理番号はオンライン復帰時に採番される
        toast.success(
          'オフラインで保存しました。電波復帰後に管理番号が自動採番されます。'
        );
      } else {
        const assigned = result.data?.koden_number;
        toast.success(
          assigned != null
            ? `受付完了 管理番号 ${formatKodenNumber(assigned)}`
            : '受付完了'
        );
      }
      setConciergeForm(emptyForm);
      setKodenResetKey((k) => k + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '参列者の登録に失敗しました';
      console.error('Error submitting concierge form:', error);
      toast.error(`登録に失敗しました: ${message}`);
    } finally {
      setSubmittingConcierge(false);
    }
  };

  return (
    <div className="min-h-screen bg-accent-cream">
      <Header backButton={true} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {ceremony && (
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-accent-dark mb-1">
              {ceremony.name}
            </h1>
            <p className="text-sm text-gray-600">代理登録フォーム</p>
          </div>
        )}

        <div className="card animate-fade-in">
          <form onSubmit={handleConciergSubmit} className="space-y-6">
            <div>
              <label className="block text-base font-semibold text-accent-dark mb-2">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={conciergeForm.full_name}
                onChange={(e) =>
                  setConciergeForm({
                    ...conciergeForm,
                    full_name: e.target.value,
                  })
                }
                placeholder="例: 山田花子"
                className="input-base text-lg py-4"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-accent-dark mb-2">
                郵便番号
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={conciergeForm.postal_code}
                onChange={(e) => handleConciergePostal(e.target.value)}
                placeholder="1234567（ハイフン不要）"
                className="input-base text-lg py-4 tracking-wider"
                maxLength={8}
              />
              {conciergeLookupLoading && (
                <p className="text-xs text-gray-500 mt-1">住所を検索中...</p>
              )}
            </div>

            <div>
              <label className="block text-base font-semibold text-accent-dark mb-2">
                住所
              </label>
              <textarea
                value={conciergeForm.address}
                onChange={(e) =>
                  setConciergeForm({
                    ...conciergeForm,
                    address: e.target.value,
                  })
                }
                placeholder="郵便番号から自動入力されます"
                rows={2}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-accent-dark mb-2">
                ご関係
              </label>
              <select
                value={conciergeForm.relation}
                onChange={(e) =>
                  setConciergeForm({
                    ...conciergeForm,
                    relation: e.target.value,
                  })
                }
                className="input-base text-lg py-4"
              >
                <option value="">選択してください</option>
                <option>親族</option>
                <option>友人</option>
                <option>会社関係</option>
                <option>近所</option>
                <option>その他</option>
              </select>
            </div>

            <div>
              <KodenInput
                key={kodenResetKey}
                onAmountChange={(amount) =>
                  setConciergeForm((prev) => ({ ...prev, koden_amount: amount }))
                }
              />
              <p className="mt-2 text-xs text-gray-500">
                香典金額は任意です。後で管理番号と香典袋を照合してから入力することもできます。
              </p>
            </div>

            <OfferingCheckboxes
              kuge={conciergeForm.has_kuge}
              kumotsu={conciergeForm.has_kumotsu}
              chouden={conciergeForm.has_chouden}
              other={conciergeForm.has_other_offering}
              onKugeChange={(v) =>
                setConciergeForm((prev) => ({ ...prev, has_kuge: v }))
              }
              onKumotsuChange={(v) =>
                setConciergeForm((prev) => ({ ...prev, has_kumotsu: v }))
              }
              onChoudenChange={(v) =>
                setConciergeForm((prev) => ({ ...prev, has_chouden: v }))
              }
              onOtherChange={(v) =>
                setConciergeForm((prev) => ({ ...prev, has_other_offering: v }))
              }
            />

            <button
              type="submit"
              disabled={submittingConcierge}
              className="w-full btn-primary text-lg py-5 disabled:opacity-50"
            >
              {submittingConcierge ? '送信中...' : '参列者を登録'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

type OfferingProps = {
  kuge: boolean;
  kumotsu: boolean;
  chouden: boolean;
  other: boolean;
  onKugeChange: (v: boolean) => void;
  onKumotsuChange: (v: boolean) => void;
  onChoudenChange: (v: boolean) => void;
  onOtherChange: (v: boolean) => void;
};

function OfferingCheckboxes({
  kuge,
  kumotsu,
  chouden,
  other,
  onKugeChange,
  onKumotsuChange,
  onChoudenChange,
  onOtherChange,
}: OfferingProps) {
  return (
    <div>
      <label className="block text-base font-semibold text-accent-dark mb-3">
        奉納（該当するものにチェック）
      </label>
      <div className="grid grid-cols-2 gap-3">
        <OfferingToggle label="供花" value={kuge} onChange={onKugeChange} />
        <OfferingToggle
          label="供物"
          value={kumotsu}
          onChange={onKumotsuChange}
        />
        <OfferingToggle
          label="弔電"
          value={chouden}
          onChange={onChoudenChange}
        />
        <OfferingToggle
          label="その他"
          value={other}
          onChange={onOtherChange}
        />
      </div>
    </div>
  );
}

function OfferingToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-center gap-2 py-4 rounded-lg border-2 font-semibold transition-all select-none ${
        value
          ? 'bg-accent-teal text-white border-accent-teal shadow-md'
          : 'bg-white text-gray-700 border-gray-300 hover:border-accent-teal'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 ${
          value
            ? 'bg-white border-white text-accent-teal'
            : 'bg-white border-gray-400 text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="text-base">{label}</span>
    </button>
  );
}
