'use client';

import { useState } from 'react';

type KodenInputProps = {
  onAmountChange: (amount: number | null) => void;
  initialAmount?: number;
};

const PRESET_AMOUNTS = [3000, 5000, 10000, 30000, 50000, 100000];

export default function KodenInput({
  onAmountChange,
  initialAmount,
}: KodenInputProps) {
  const [amount, setAmount] = useState<number | string>(initialAmount || '');
  const [customAmount, setCustomAmount] = useState<string>('');

  const handlePresetClick = (preset: number) => {
    // Toggle off if clicking the already-selected preset.
    if (amount === preset) {
      setAmount('');
      setCustomAmount('');
      onAmountChange(null);
      return;
    }
    setAmount(preset);
    setCustomAmount('');
    onAmountChange(preset);
  };

  const handleCustomAmount = (value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setCustomAmount(value);
    setAmount(value === '' ? '' : (numValue as number));
    onAmountChange(numValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-base font-semibold text-accent-dark mb-3">
          香典金額（任意）
        </label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`py-5 px-3 rounded-lg font-bold transition-all text-lg select-none ${
                amount === preset
                  ? 'bg-accent-teal text-white shadow-md scale-[0.98]'
                  : 'bg-gray-100 text-accent-dark border-2 border-gray-200 hover:border-accent-teal active:scale-[0.97]'
              }`}
            >
              ¥{preset.toLocaleString('ja-JP')}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <span className="text-gray-600 mr-2 text-lg">¥</span>
          <input
            type="number"
            inputMode="numeric"
            value={customAmount}
            onChange={(e) => handleCustomAmount(e.target.value)}
            placeholder="その他の金額を直接入力"
            className="flex-1 px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-accent-teal"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          管理番号は受付完了時に自動採番されます
        </p>
      </div>
    </div>
  );
}
