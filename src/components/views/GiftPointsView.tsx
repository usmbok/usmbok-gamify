import { useEffect, useState, useCallback } from 'react';
import {
  Gift, CreditCard, Send, Search, Heart, Star,
  CheckCircle, ArrowRight, ArrowUpRight, ArrowDownLeft,
  Sparkles, ShoppingCart, X, Package, Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';

interface GiftPack {
  id: string;
  name: string;
  description: string | null;
  points: number;
  price_usd: number;
  display_order: number;
}

interface GiftOrder {
  id: string;
  pack_id: string;
  points_purchased: number;
  price_usd: number;
  status: string;
  created_at: string;
  pack?: { name: string } | null;
}

interface PointGift {
  id: string;
  sender_id: string;
  recipient_id: string;
  points: number;
  message: string | null;
  created_at: string;
  sender?: { full_name: string | null; username: string | null } | null;
  recipient?: { full_name: string | null; username: string | null } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  gift_points_balance: number;
}

type Tab = 'store' | 'gift' | 'history';

export function GiftPointsView() {
  const { bypassUserId } = useBypass();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [packs, setPacks] = useState<GiftPack[]>([]);
  const [orders, setOrders] = useState<GiftOrder[]>([]);
  const [gifts, setGifts] = useState<PointGift[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('store');

  const [checkoutPack, setCheckoutPack] = useState<GiftPack | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const [giftSearch, setGiftSearch] = useState('');
  const [giftRecipient, setGiftRecipient] = useState<Profile | null>(null);
  const [giftAmount, setGiftAmount] = useState(10);
  const [giftMessage, setGiftMessage] = useState('');
  const [gifting, setGifting] = useState(false);
  const [giftError, setGiftError] = useState('');
  const [giftSuccess, setGiftSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId(bypassUserId);
    setCurrentUserId(userId);

    const [packsRes, profileRes, ordersRes, giftsRes, usersRes] = await Promise.all([
      supabase.from('gift_point_packs').select('*').eq('is_active', true).order('display_order'),
      userId ? supabase.from('profiles').select('id, full_name, username, gift_points_balance').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? supabase.from('gift_point_orders').select('*, pack:pack_id(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      userId ? supabase.from('point_gifts').select('*, sender:sender_id(full_name,username), recipient:recipient_id(full_name,username)').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
      supabase.from('profiles').select('id, full_name, username, gift_points_balance').order('full_name').limit(100),
    ]);

    setPacks(packsRes.data || []);
    setProfile(profileRes.data || null);
    setOrders(ordersRes.data || []);
    setGifts(giftsRes.data || []);
    setUsers((usersRes.data || []).filter((u: Profile) => u.id !== userId));
    setLoading(false);
  }, [bypassUserId]);

  useEffect(() => { load(); }, [load]);

  const simulatePurchase = async () => {
    if (!checkoutPack || !currentUserId) return;
    setPurchasing(true);
    await new Promise(r => setTimeout(r, 1800));

    const { error: orderErr } = await supabase.from('gift_point_orders').insert({
      user_id: currentUserId,
      pack_id: checkoutPack.id,
      points_purchased: checkoutPack.points,
      price_usd: checkoutPack.price_usd,
      status: 'completed',
    });

    if (!orderErr) {
      await supabase.from('profiles').update({
        gift_points_balance: (profile?.gift_points_balance || 0) + checkoutPack.points,
      }).eq('id', currentUserId);
      setProfile(p => p ? { ...p, gift_points_balance: (p.gift_points_balance || 0) + checkoutPack.points } : p);
    }

    setPurchasing(false);
    setPurchaseSuccess(true);
    setTimeout(() => {
      setPurchaseSuccess(false);
      setCheckoutPack(null);
      load();
    }, 2500);
  };

  const handleGift = async () => {
    setGiftError('');
    if (!giftRecipient) { setGiftError('Please select a recipient.'); return; }
    if (!giftAmount || giftAmount < 1) { setGiftError('Amount must be at least 1.'); return; }
    if (!profile || profile.gift_points_balance < giftAmount) { setGiftError('Insufficient gift points balance.'); return; }
    if (!currentUserId) return;
    setGifting(true);

    const { error } = await supabase.from('point_gifts').insert({
      sender_id: currentUserId,
      recipient_id: giftRecipient.id,
      points: giftAmount,
      message: giftMessage.trim() || null,
    });

    if (error) { setGiftError(error.message); setGifting(false); return; }

    await supabase.from('profiles').update({
      gift_points_balance: profile.gift_points_balance - giftAmount,
    }).eq('id', currentUserId);

    await supabase.from('profiles').update({
      gift_points_balance: (giftRecipient.gift_points_balance || 0) + giftAmount,
    }).eq('id', giftRecipient.id);

    setProfile(p => p ? { ...p, gift_points_balance: p.gift_points_balance - giftAmount } : p);
    setGifting(false);
    setGiftSuccess(true);
    setGiftRecipient(null);
    setGiftAmount(10);
    setGiftMessage('');
    setGiftSearch('');
    setTimeout(() => setGiftSuccess(false), 4000);
    load();
  };

  const filteredUsers = users.filter(u => {
    const q = giftSearch.toLowerCase();
    return !q || (u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
  });

  const userName = (u: { full_name: string | null; username: string | null } | null | undefined) =>
    u?.full_name || u?.username || 'Unknown';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Gift className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Gift Points</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Buy gift point packs and send them as recognition to fellow subscribers.
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2 px-5 py-3 bg-primary/10 border border-primary/20 rounded-2xl">
            <Gift className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Gift Balance</p>
              <p className="text-xl font-bold text-primary">{profile.gift_points_balance.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 border border-border w-fit">
        {([
          { id: 'store', label: 'Point Store', icon: ShoppingCart },
          { id: 'gift', label: 'Send a Gift', icon: Send },
          { id: 'history', label: 'History', icon: Clock },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'store' && (
        <div className="space-y-6">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">Simulated Stripe Checkout</p>
              <p className="text-sm text-muted-foreground">
                Purchasing is currently simulated — no real charge is made. When Stripe is connected, this will redirect to a secure payment page. Gift points are added to your balance immediately after purchase.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map(pack => (
              <div
                key={pack.id}
                className="relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg group"
              >
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{pack.name}</h3>
                  </div>
                  {pack.description && (
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{pack.description}</p>
                  )}
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-3xl font-bold text-primary">{pack.points.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">gift points</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${pack.price_usd.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">USD</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4 bg-secondary rounded-lg px-3 py-1.5">
                    ≈ ${(pack.price_usd / pack.points * 100).toFixed(1)}¢ per 100 points
                  </div>
                  <button
                    onClick={() => setCheckoutPack(pack)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors group-hover:shadow-md"
                  >
                    <CreditCard className="w-4 h-4" />
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {packs.length === 0 && (
            <div className="bg-card border border-border rounded-2xl py-16 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No gift point packs available right now.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'gift' && (
        <div className="max-w-lg space-y-6">
          {giftSuccess && (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Gift sent successfully!</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Search & Select Recipient</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={giftSearch}
                  onChange={e => setGiftSearch(e.target.value)}
                  placeholder="Search by name or username..."
                  className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              {giftRecipient ? (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {(giftRecipient.full_name || giftRecipient.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{giftRecipient.full_name || giftRecipient.username}</p>
                      {giftRecipient.username && giftRecipient.full_name && (
                        <p className="text-xs text-muted-foreground">@{giftRecipient.username}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setGiftRecipient(null)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : giftSearch.trim() && (
                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-3">No users found</p>
                  ) : filteredUsers.slice(0, 8).map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setGiftRecipient(u); setGiftSearch(''); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {(u.full_name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || u.username}</p>
                        {u.username && u.full_name && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Gift Amount <span className="text-muted-foreground text-xs">(your balance: {(profile?.gift_points_balance || 0).toLocaleString()} pts)</span>
              </label>
              <div className="flex gap-2 flex-wrap mb-2">
                {[10, 25, 50, 100, 200, 500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setGiftAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      giftAmount === amt ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={profile?.gift_points_balance || 0}
                value={giftAmount}
                onChange={e => setGiftAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Personal Message <span className="text-muted-foreground text-xs">(optional)</span></label>
              <textarea
                value={giftMessage}
                onChange={e => setGiftMessage(e.target.value)}
                rows={3}
                placeholder="Add a personal note to your gift..."
                className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {giftError && <p className="text-sm text-red-500">{giftError}</p>}

            <button
              onClick={handleGift}
              disabled={gifting || !giftRecipient}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {gifting
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Gift className="w-5 h-5" /> Send {giftAmount.toLocaleString()} Gift Points</>
              }
            </button>
          </div>

          <div className="bg-secondary/50 rounded-xl px-5 py-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">How it works</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> Buy gift point packs from the Point Store using the simulated checkout.</li>
              <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> Gift points are credited to your balance instantly after purchase.</li>
              <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> Send any amount to any subscriber as recognition or appreciation.</li>
              <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> Recipients can use gift points alongside their earned points.</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold mb-3">Purchase History</h3>
            {orders.length === 0 ? (
              <div className="bg-card border border-border rounded-xl py-10 text-center">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No purchases yet</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {orders.map(order => (
                    <div key={order.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{(order.pack as { name: string } | null)?.name || 'Gift Pack'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">+{order.points_purchased.toLocaleString()} pts</p>
                        <p className="text-xs text-muted-foreground">${order.price_usd.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">Gift Transactions</h3>
            {gifts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl py-10 text-center">
                <Gift className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No gifts sent or received yet</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {gifts.map(gift => {
                    const sent = gift.sender_id === currentUserId;
                    return (
                      <div key={gift.id} className="flex items-start gap-4 px-5 py-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${sent ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
                          {sent
                            ? <ArrowUpRight className="w-4 h-4 text-orange-500" />
                            : <ArrowDownLeft className="w-4 h-4 text-green-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {sent
                              ? <>Sent to <strong>{userName(gift.recipient)}</strong></>
                              : <>Received from <strong>{userName(gift.sender)}</strong></>
                            }
                          </p>
                          {gift.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{gift.message}"</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(gift.created_at).toLocaleString()}</p>
                        </div>
                        <div className={`text-sm font-bold flex-shrink-0 ${sent ? 'text-orange-500' : 'text-green-500'}`}>
                          {sent ? '-' : '+'}{gift.points.toLocaleString()} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {checkoutPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            {purchaseSuccess ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Purchase Complete!</h3>
                <p className="text-muted-foreground text-sm">
                  <strong className="text-primary">{checkoutPack.points.toLocaleString()} gift points</strong> have been added to your balance.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">Simulated Checkout</h3>
                  </div>
                  <button onClick={() => setCheckoutPack(null)} className="p-1.5 rounded-lg hover:bg-accent">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    This is a simulated Stripe checkout. No real payment is processed.
                  </div>

                  <div className="bg-secondary rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">{checkoutPack.name}</span>
                      <span className="text-sm text-muted-foreground">{checkoutPack.points.toLocaleString()} pts</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-bold">Total</span>
                      <span className="text-lg font-bold text-primary">${checkoutPack.price_usd.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Card Number</label>
                      <input defaultValue="4242 4242 4242 4242" readOnly className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Expiry</label>
                        <input defaultValue="12/28" readOnly className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">CVC</label>
                        <input defaultValue="***" readOnly className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={simulatePurchase}
                    disabled={purchasing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-70 transition-colors"
                  >
                    {purchasing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pay ${checkoutPack.price_usd.toFixed(2)} (Simulated)
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
