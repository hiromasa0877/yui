'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Attendee } from '@/types/database';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export function useRealtimeAttendees(ceremonyId: string) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('attendees')
        .select('*')
        .eq('ceremony_id', ceremonyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAttendees(data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch attendees';
      setError(message);
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  }, [ceremonyId]);

  useEffect(() => {
    // Initial fetch
    fetchAttendees();

    // Subscribe to realtime updates
    // Unique channel name per effect run to avoid React Strict Mode collision
    const channelName = `attendees-hook:${ceremonyId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendees',
          filter: `ceremony_id=eq.${ceremonyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAttendees((prev) => [payload.new as Attendee, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAttendees((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Attendee).id
                  ? (payload.new as Attendee)
                  : a
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAttendees((prev) =>
              prev.filter((a) => a.id !== (payload.old as Attendee).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ceremonyId, fetchAttendees]);

  return {
    attendees,
    loading,
    error,
    refetch: fetchAttendees,
  };
}
