import { useEffect, useState } from 'react';
import { Gift, ShoppingBag, Star, Zap, ChevronRight, CheckCircle, Clock, XCircle, Info, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import type { RewardsCatalogItem, RedemptionRequest } from '../../types/rewards';
import type { Profile } from '../../types/database';

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Rewards',
  gift_card: 'Gift Cards',
  digital: 'Digital',
  subscription: 'Subscriptions',
  cash: 'Cash Out',
  charity: 'Charity',
  experience: 'Experiences',
};

const CATEGORY_COLORS: Record<string, string> = {
  gift_card: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  digital: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  subscription: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  cash: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  charity: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  experience: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const BRAND_ICONS: Record<string, string> = {
  Amazon: '🛒',
  Walmart: '🏪',
  Starbucks: '☕',
  Target: '🎯',
  Apple: '🍎',
  Google: '🔍',
  Netflix: '🎬',
  Spotify: '🎵',
  DoorDash: '🍔',
  Uber: '🚗',
  'Best Buy': '💻',
  'Home Depot': '🔨',
  Various: '💝',
  Company: '🏢',
  LinkedIn: '💼',
  Udemy: '🎓',
  PayPal: '💰',
};

function RedeemModal({
  reward,
  userPoints,
  onClose,
  onRedeem,
}: {
  reward: RewardsCatalogItem;
  userPoints: number;
  onClose: () => void;
  onRedeem: (rewardId: string, dollarValue: number, pointsSpent: number) => Promise<void>;
}) {
  const rate = reward.conversion_rate?.points_per_dollar ?? 100;
  const denominations = reward.denomination_options ?? [];
  const [selected, setSelected] = useState<number>(denominations[0] ?? 5);
  const [loading, setLoading] = useState(false);

  const pointsNeeded = Math.ceil(selected * rate);
  const canAfford = userPoints >= pointsNeeded;

  const handleRedeem = async () => {
    setLoading(true);
    await onRedeem(reward.id, selected, pointsNeeded);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-4xl mb-2">{BRAND_ICONS[reward.brand ?? ''] ?? '🎁'}</div>
            <h3 className="text-xl font-bold text-foreground">{reward.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{reward.description}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-secondary rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Your balance</span>
            <span className="font-bold text-foreground flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {userPoints.toLocaleString()} pts
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Conversion rate</span>
            <span className="text-foreground">{rate} pts = $1.00</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-2">Select Amount</label>
          <div className="grid grid-cols-3 gap-2">
            {denominations.map((d) => {
              const pts = Math.ceil(d * rate);
              const affordable = userPoints >= pts;
              return (
                <button
                  key={d}
                  onClick={() => affordable && setSelected(d)}
                  className={`py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                    selected === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : affordable
                      ? 'border-border hover:border-primary/50 text-foreground'
                      : 'border-border opacity-40 cursor-not-allowed text-muted-foreground'
                  }`}
                >
                  <div>${d}</div>
                  <div className="text-xs font-normal opacity-70">{pts.toLocaleString()}pts</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-secondary rounded-xl p-4 mb-5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">You will spend</span>
          <div className="text-right">
            <div className="font-bold text-lg text-foreground flex items-center gap-1 justify-end">
              <Zap className="w-4 h-4 text-orange-500" />
              {pointsNeeded.toLocaleString()} pts
            </div>
            <div className="text-xs text-muted-foreground">for ${selected} value</div>
          </div>
        </div>

        {!canAfford && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 mb-4">
            <Info className="w-4 h-4 flex-shrink-0" />
            You need {(pointsNeeded - userPoints).toLocaleString()} more points
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleRedeem}
            disabled={!canAfford || loading}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
          >
            {loading ? 'Redeeming...' : `Redeem $${selected}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RewardsView() {
  const { bypassUserId } = useBypass();
  const [rewards, setRewards] = useState<RewardsCatalogItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'history' | 'rates'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReward, setSelectedReward] = useState<RewardsCatalogItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [bypassUserId]);

  const loadData = async () => {
    try {
      const userId = await getCurrentUserId(bypassUserId);

      const rewardsRes = await supabase
        .from('rewards_catalog')
        .select('*, conversion_rate:reward_conversion_rates(id, points_per_dollar, min_dollar_value, max_dollar_value)')
        .eq('is_active', true)
        .order('sort_order');

      if (rewardsRes.data) {
        const normalized = rewardsRes.data.map((r) => ({
          ...r,
          denomination_options: Array.isArray(r.denomination_options) ? r.denomination_options : [],
          conversion_rate: Array.isArray(r.conversion_rate) ? r.conversion_rate[0] : r.conversion_rate,
        }));
        setRewards(normalized);
      }

      if (!userId) { setLoading(false); return; }

      const [profileRes, redemptionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase
          .from('redemption_requests')
          .select('*, reward:rewards_catalog(name, brand, category)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      setRedemptions(redemptionsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId: string, dollarValue: number, pointsSpent: number) => {
    const userId = await getCurrentUserId(bypassUserId);
    if (!userId || !profile) return;

    const { error } = await supabase.from('redemption_requests').insert({
      user_id: userId,
      reward_id: rewardId,
      points_spent: pointsSpent,
      dollar_value: dollarValue,
      status: 'pending',
    });

    if (!error) {
      await supabase
        .from('profiles')
        .update({ total_points: Math.max(0, profile.total_points - pointsSpent) })
        .eq('id', userId);

      setSelectedReward(null);
      setSuccessMsg(`Redemption submitted! Your ${rewards.find(r => r.id === rewardId)?.name} is being processed.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      loadData();
    }
  };

  const filteredRewards = categoryFilter === 'all'
    ? rewards
    : rewards.filter((r) => r.category === categoryFilter);

  const featuredRewards = rewards.filter((r) => r.is_featured);
  const categories = ['all', ...Array.from(new Set(rewards.map((r) => r.category)))];

  const statusIcon = (status: string) => {
    if (status === 'fulfilled') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'processing') return <Clock className="w-4 h-4 text-blue-500" />;
    if (status === 'cancelled' || status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-orange-500" />;
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      fulfilled: 'Delivered',
      cancelled: 'Cancelled',
      failed: 'Failed',
    };
    return labels[status] ?? status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-xl text-green-700 dark:text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold text-foreground">Rewards</h2>
            <p className="text-sm text-muted-foreground">Convert your points into real rewards</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <div className="text-right">
            <div className="text-xl font-bold text-foreground">{(profile?.total_points ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">points available</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['catalog', 'history', 'rates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'catalog' ? 'Rewards Catalog' : tab === 'history' ? 'My Redemptions' : 'Conversion Rates'}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {featuredRewards.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Featured Rewards
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    userPoints={profile?.total_points ?? 0}
                    onSelect={setSelectedReward}
                    featured
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      categoryFilter === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userPoints={profile?.total_points ?? 0}
                  onSelect={setSelectedReward}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {redemptions.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No redemptions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start earning and redeeming your points!</p>
            </div>
          ) : (
            redemptions.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="text-2xl w-10 text-center">
                  {BRAND_ICONS[(r.reward as RewardsCatalogItem & { brand?: string })?.brand ?? ''] ?? '🎁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{(r.reward as RewardsCatalogItem)?.name ?? 'Reward'}</div>
                  <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">${r.dollar_value}</div>
                  <div className="text-xs text-muted-foreground">{r.points_spent.toLocaleString()} pts</div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  r.status === 'fulfilled' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                  r.status === 'processing' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                  r.status === 'pending' ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' :
                  'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                }`}>
                  {statusIcon(r.status)}
                  {statusLabel(r.status)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <div className="font-semibold mb-1">How Points Conversion Works</div>
                <p>Each reward category has a different conversion rate. The table below shows how many points equal $1.00 for each category. Cash redemptions require more points per dollar, while charity donations offer a better rate.</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Category</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Points per $1</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">$5 costs</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">$25 costs</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">$100 costs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { category: 'Gift Cards', rate: 100 },
                  { category: 'Digital Goods', rate: 100 },
                  { category: 'Subscriptions', rate: 100 },
                  { category: 'Cash Out (PayPal)', rate: 120 },
                  { category: 'Charity Donations', rate: 80 },
                  { category: 'Experiences', rate: 150 },
                ].map((row) => (
                  <tr key={row.category} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[row.category.split(' ')[0].toLowerCase()] ?? 'bg-secondary text-foreground'}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3 font-mono font-bold text-foreground">{row.rate}</td>
                    <td className="text-center px-4 py-3 text-muted-foreground font-mono text-sm">{(5 * row.rate).toLocaleString()}</td>
                    <td className="text-center px-4 py-3 text-muted-foreground font-mono text-sm">{(25 * row.rate).toLocaleString()}</td>
                    <td className="text-center px-4 py-3 text-muted-foreground font-mono text-sm">{(100 * row.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-foreground mb-1">100</div>
              <div className="text-sm text-muted-foreground">Standard Rate</div>
              <div className="text-xs text-muted-foreground mt-1">Gift cards & digital goods</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">80</div>
              <div className="text-sm text-muted-foreground">Best Rate</div>
              <div className="text-xs text-muted-foreground mt-1">Charity donations</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-orange-500 mb-1">150</div>
              <div className="text-sm text-muted-foreground">Premium Rate</div>
              <div className="text-xs text-muted-foreground mt-1">Exclusive experiences</div>
            </div>
          </div>
        </div>
      )}

      {selectedReward && (
        <RedeemModal
          reward={selectedReward}
          userPoints={profile?.total_points ?? 0}
          onClose={() => setSelectedReward(null)}
          onRedeem={handleRedeem}
        />
      )}
    </div>
  );
}

function RewardCard({
  reward,
  userPoints,
  onSelect,
  featured = false,
}: {
  reward: RewardsCatalogItem;
  userPoints: number;
  onSelect: (r: RewardsCatalogItem) => void;
  featured?: boolean;
}) {
  const rate = reward.conversion_rate?.points_per_dollar ?? 100;
  const minPoints = reward.min_redemption_points;
  const canAfford = userPoints >= minPoints;
  const minDollar = reward.conversion_rate?.min_dollar_value ?? 5;

  return (
    <button
      onClick={() => onSelect(reward)}
      className={`relative group text-left bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        featured ? 'border-yellow-400/50 ring-1 ring-yellow-400/20' : 'border-border'
      } ${!canAfford ? 'opacity-60' : ''}`}
    >
      {featured && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
            Featured
          </div>
        </div>
      )}

      <div className="p-4 pb-3">
        <div className="text-4xl mb-3 text-center">{BRAND_ICONS[reward.brand ?? ''] ?? '🎁'}</div>
        <div className="text-center">
          <div className="font-semibold text-sm text-foreground leading-tight">{reward.name}</div>
          {reward.brand && (
            <div className="text-xs text-muted-foreground mt-0.5">{reward.brand}</div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className={`text-xs font-medium px-2 py-1 rounded-full text-center mb-3 ${CATEGORY_COLORS[reward.category] ?? 'bg-secondary text-foreground'}`}>
          {CATEGORY_LABELS[reward.category] ?? reward.category}
        </div>

        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Starting from</div>
          <div className="font-bold text-foreground flex items-center justify-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>{(minDollar * rate).toLocaleString()} pts</span>
          </div>
          <div className="text-xs text-muted-foreground">${minDollar} value</div>
        </div>

        <div className={`mt-3 py-2 px-3 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5 transition-colors ${
          canAfford
            ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
            : 'bg-secondary text-muted-foreground'
        }`}>
          {canAfford ? (
            <>Redeem <ChevronRight className="w-3 h-3" /></>
          ) : (
            `Need ${(minPoints - userPoints).toLocaleString()} more pts`
          )}
        </div>
      </div>
    </button>
  );
}
