import { UtensilsCrossed } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-100 mb-6">
          <UtensilsCrossed className="w-10 h-10 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MenuMate</h1>
        <p className="text-gray-500 mb-8">Digital restaurant menus, beautifully simple.</p>
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 text-sm text-gray-600 text-left">
          <p className="font-medium text-gray-800 mb-1">Looking for a menu?</p>
          <p>Visit your restaurant's link, e.g.:</p>
          <code className="block mt-2 bg-gray-100 rounded px-3 py-2 text-xs text-gray-700 font-mono">
            {window.location.host}/<span className="text-primary-600">your-restaurant</span>
          </code>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          Restaurant owner?{' '}
          <a href="/super-admin/login" className="text-primary-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
