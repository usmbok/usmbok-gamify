export interface RewardsCatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  image_url: string | null;
  denomination_options: number[];
  min_redemption_points: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  conversion_rate?: RewardConversionRate;
}

export interface RewardConversionRate {
  id: string;
  reward_id: string;
  points_per_dollar: number;
  min_dollar_value: number;
  max_dollar_value: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface RedemptionRequest {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  dollar_value: number;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled' | 'failed';
  delivery_info: Record<string, unknown>;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  reward?: RewardsCatalogItem;
}
