import { useEffect, useState } from 'react';
import { Activity, Plus, CreditCard as Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ActivityType } from '../../types/database';
import { ViewToggle } from '../ui/ViewToggle';
import { Modal } from './Modal';
import { useRecentViews } from '../../hooks/useRecentViews';

export function ActivityTypesManager() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [view, setView] = useState<'list' | 'card'>('list');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActivityType | null>(null);
  const { recentViews, addRecentView } = useRecentViews('activity_type');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_points: 0,
    base_xp: 0,
    industry_sector: '',
    is_active: true
  });

  useEffect(() => {
    loadActivityTypes();
  }, []);

  const loadActivityTypes = async () => {
    try {
      const { data } = await supabase
        .from('activity_types')
        .select('*')
        .order('created_at', { ascending: false });

      setActivityTypes(data || []);
    } catch (error) {
      console.error('Error loading activity types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      base_points: 0,
      base_xp: 0,
      industry_sector: '',
      is_active: true
    });
    setModalOpen(true);
  };

  const handleEdit = (item: ActivityType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      base_points: item.base_points,
      base_xp: item.base_xp,
      industry_sector: item.industry_sector || '',
      is_active: item.is_active
    });
    setModalOpen(true);
    addRecentView('activity_type', item.id, item.name);
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await supabase
          .from('activity_types')
          .update(formData)
          .eq('id', editingItem.id);
      } else {
        await supabase
          .from('activity_types')
          .insert(formData);
      }

      setModalOpen(false);
      loadActivityTypes();
    } catch (error) {
      console.error('Error saving activity type:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity type?')) return;

    try {
      await supabase
        .from('activity_types')
        .delete()
        .eq('id', id);

      loadActivityTypes();
    } catch (error) {
      console.error('Error deleting activity type:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Activity Types</h3>
        <div className="flex gap-2">
          <ViewToggle mode={view} onChange={setView} />
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Activity Type
          </button>
        </div>
      </div>

      {recentViews.length > 0 && (
        <div className="bg-secondary rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">Recently Viewed</h4>
          <div className="flex gap-2 flex-wrap">
            {recentViews.map((rv) => {
              const item = activityTypes.find(at => at.id === rv.entity_id);
              if (!item) return null;
              return (
                <button
                  key={rv.id}
                  onClick={() => handleEdit(item)}
                  className="text-xs px-2 py-1 bg-card border border-border rounded hover:bg-accent"
                >
                  {rv.entity_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === 'list' ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Points</th>
                <th className="px-4 py-3 text-right text-sm font-medium">XP</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activityTypes.map((item) => (
                <tr key={item.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.description}</td>
                  <td className="px-4 py-3 text-right">{item.base_points}</td>
                  <td className="px-4 py-3 text-right">{item.base_xp}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                      item.is_active
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 hover:bg-accent rounded text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activityTypes.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">{item.name}</h4>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  item.is_active
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
              <div className="flex gap-4 mb-3 text-sm">
                <span className="text-yellow-500">{item.base_points} pts</span>
                <span className="text-orange-500">{item.base_xp} XP</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 px-3 py-2 bg-secondary hover:bg-accent rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Activity Type' : 'Create Activity Type'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Base Points</label>
              <input
                type="number"
                value={formData.base_points}
                onChange={(e) => setFormData({ ...formData, base_points: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base XP</label>
              <input
                type="number"
                value={formData.base_xp}
                onChange={(e) => setFormData({ ...formData, base_xp: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Industry Sector</label>
            <input
              type="text"
              value={formData.industry_sector}
              onChange={(e) => setFormData({ ...formData, industry_sector: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
              placeholder="e.g., customer_support"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-secondary rounded-lg hover:bg-accent flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
