import { useState, useEffect, useRef } from 'react';
import { MenuItem, Category } from '@/types';
import Modal from './Modal';
import ImageUploader from './ImageUploader';
import RecipeEditor, { type RecipeLine } from './inventory/RecipeEditor';
import { inventoryAPI } from '@/services/api';
import toast from 'react-hot-toast';

interface MenuItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<MenuItem, '_id' | 'id'>) => Promise<any>;
  categories: Category[];
  editItem?: MenuItem | null;
  defaultCategoryId?: string;
}

export default function MenuItemForm({ isOpen, onClose, onSave, categories, editItem, defaultCategoryId }: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    hasImage: true,
    type: 'veg' as 'veg' | 'non-veg',
    popular: false,
    available: true,
    calories: '',
  });
  const [loading, setLoading] = useState(false);
  // Recipe lines are captured from RecipeEditor and persisted on save (new + edit).
  const recipeRef = useRef<{ lines: RecipeLine[]; enabled: boolean }>({ lines: [], enabled: false });

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        description: editItem.description,
        price: editItem.price.toString(),
        category: editItem.category,
        image: editItem.image || '',
        hasImage: editItem.hasImage,
        type: editItem.type,
        popular: editItem.popular,
        available: editItem.available,
        calories: editItem.calories != null ? String(editItem.calories) : '',
      });
    } else {
      resetForm(defaultCategoryId);
    }
  }, [editItem, isOpen, defaultCategoryId]);

  const resetForm = (catId?: string) => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: catId || categories[0]?.id || '',
      image: '',
      hasImage: true,
      type: 'veg',
      popular: false,
      available: true,
      calories: '',
    });
  };

  const handleImageUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, image: url, hasImage: url.length > 0 ? prev.hasImage : false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter dish name');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter valid price');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (formData.hasImage && !formData.image.trim()) {
      toast.error('Please upload an image or disable the image toggle');
      return;
    }

    setLoading(true);
    try {
      const saved = await onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        image: formData.hasImage ? formData.image.trim() : undefined,
        hasImage: formData.hasImage,
        type: formData.type,
        popular: formData.popular,
        available: formData.available,
        calories: formData.calories === '' ? null : Number(formData.calories),
      });
      // Persist the recipe/BOM against the saved item (best-effort; won't block item save).
      const itemId = saved?.id || editItem?.id;
      if (recipeRef.current.enabled && itemId) {
        try {
          await inventoryAPI.saveRecipe(itemId, recipeRef.current.lines
            .filter(l => l.inventoryItemId && Number(l.quantity) > 0)
            .map(l => ({ inventoryItemId: l.inventoryItemId, quantity: Number(l.quantity), unit: l.unit })));
        } catch { /* recipe save failed — item still saved */ }
      }
      toast.success(editItem ? 'Item updated successfully' : 'Item added successfully');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to save item');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Menu Item' : 'Add New Menu Item'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Dish Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dish Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="Enter dish name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field min-h-[100px]"
                placeholder="Enter dish description"
                rows={4}
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input-field"
                placeholder="Enter price"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Calories (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calories <span className="text-gray-400 font-normal">(optional · kcal)</span>
              </label>
              <input
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="input-field"
                placeholder="e.g. 320"
                min="0"
                step="1"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Image Toggle */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="text-sm font-medium text-gray-700">Include Image</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formData.hasImage ? 'Item will show with image' : 'Item will show as compact pill'}
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.hasImage}
                    onChange={(e) => {
                      setFormData({ ...formData, hasImage: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </div>
              </label>
            </div>

            {/* Image Upload - Only show if hasImage is true */}
            {formData.hasImage && (
              <ImageUploader
                value={formData.image}
                onChange={handleImageUrlChange}
                folder="menu"
                label="Dish Image"
                hint="JPG, PNG, WEBP · Max 5 MB · Recommended 800×600 px"
                aspectRatio="auto"
              />
            )}

            {/* Compact Preview - Show when no image */}
            {!formData.hasImage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview (Compact Layout)
                </label>
                <div className="bg-white rounded-full shadow-sm border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={formData.type === 'veg' ? 'badge-veg flex-shrink-0' : 'badge-non-veg flex-shrink-0'}>
                        <div className={`w-2 h-2 rounded-full ${
                          formData.type === 'veg' ? 'bg-green-600' : 'bg-red-600'
                        }`} />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {formData.name || 'Item Name'}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary-700 whitespace-nowrap">
                      ₹{formData.price || '0'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="veg"
                    checked={formData.type === 'veg'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'veg' })}
                    className="mr-2"
                  />
                  <span className="badge-veg mr-2">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                  </span>
                  Vegetarian
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="non-veg"
                    checked={formData.type === 'non-veg'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'non-veg' })}
                    className="mr-2"
                  />
                  <span className="badge-non-veg mr-2">
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                  </span>
                  Non-Vegetarian
                </label>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.popular}
                  onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Mark as Popular</span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Available</span>
              </label>
            </div>
          </div>
        </div>

        {/* Recipe / BOM — works for new & existing items; self-hides if inventory module is off */}
        <RecipeEditor
          menuItemId={editItem?.id}
          dishPrice={parseFloat(formData.price) || 0}
          onChange={(lines, enabled) => { recipeRef.current = { lines, enabled }; }}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
