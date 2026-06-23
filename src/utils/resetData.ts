// Utility to reset all data to initial state
export const resetAllData = () => {
  // Clear all mock API data
  localStorage.removeItem('mock_categories');
  localStorage.removeItem('mock_menu_items');
  
  // Clear restaurant settings (optional - uncomment if you want to reset this too)
  // localStorage.removeItem('restaurant_settings');
  
  // Clear favorites
  localStorage.removeItem('favorites');
  
  console.log('✅ All data has been reset to initial state');
  
  // Reload the page to reinitialize with sample data
  window.location.reload();
};

// Add to window for easy access from console
if (typeof window !== 'undefined') {
  (window as any).resetData = resetAllData;
}
