import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface RecentView {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  viewed_at: string;
}

export function useRecentViews(entityType?: string) {
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentViews();
  }, [entityType]);

  const loadRecentViews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('recent_views')
        .select('*')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(10);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data } = await query;
      setRecentViews(data || []);
    } catch (error) {
      console.error('Error loading recent views:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRecentView = async (entityType: string, entityId: string, entityName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('recent_views')
        .upsert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,entity_type,entity_id'
        });

      loadRecentViews();
    } catch (error) {
      console.error('Error adding recent view:', error);
    }
  };

  return { recentViews, loading, addRecentView };
}
