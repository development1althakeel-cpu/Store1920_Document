'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowUp, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { DEFAULT_SCROLL_TO_TOP, normalizeScrollToTop } from '@/lib/scrollToTopSettings';

export default function ScrollToTopCustomizePage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(DEFAULT_SCROLL_TO_TOP.enabled);
  const [position, setPosition] = useState(DEFAULT_SCROLL_TO_TOP.position);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/appearance/sections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const next = normalizeScrollToTop(data?.scrollToTop);
      setEnabled(next.enabled);
      setPosition(next.position);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load scroll-to-top settings');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      await axios.post('/api/store/appearance/sections', {
        scrollToTop: { enabled, position },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Scroll-to-top settings saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/store/customize"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Customize
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Scroll to top button</h1>
        <p className="mt-1 text-sm text-slate-500">
          Show a button after the customer scrolls down. Clicking it returns to the top of the page.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Loading settings…
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Show scroll-to-top button</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Appears after the customer scrolls down the storefront.
              </span>
            </span>
          </label>

          <fieldset disabled={!enabled} className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">Button position</legend>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
              position === 'right' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
            } ${enabled ? '' : 'opacity-60'}`}>
              <input
                type="radio"
                name="scroll-to-top-position"
                checked={position === 'right'}
                onChange={() => setPosition('right')}
                className="mt-1 h-4 w-4 border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Right bottom, above Tawk</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  Sits above the live-chat icon on the right.
                </span>
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
              position === 'left' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
            } ${enabled ? '' : 'opacity-60'}`}>
              <input
                type="radio"
                name="scroll-to-top-position"
                checked={position === 'left'}
                onChange={() => setPosition('left')}
                className="mt-1 h-4 w-4 border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Left bottom</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  Sits in the lower-left corner, away from Tawk.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white">
                <ArrowUp size={18} />
              </span>
              Preview: {position === 'left' ? 'left bottom' : 'right bottom, above Tawk'}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
