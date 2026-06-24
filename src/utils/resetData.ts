// Utility to reset all SaaS tenant data to initial state
export const resetAllData = () => {
  localStorage.removeItem('saas_tenants');
  localStorage.removeItem('saas_users');
  localStorage.removeItem('saas_subscriptions');
  localStorage.removeItem('saas_menu_items');
  localStorage.removeItem('saas_categories');
  localStorage.removeItem('saas_audit_logs');
  localStorage.removeItem('saas_domains');
  localStorage.removeItem('admin_token');
  localStorage.removeItem('current_tenant_id');
  localStorage.removeItem('favorites');

  console.log('All data has been reset to initial state');

  // Reload the page to reinitialize with defaults
  window.location.reload();
};

// Add to window for easy access from console
if (typeof window !== 'undefined') {
  (window as any).resetData = resetAllData;
}
