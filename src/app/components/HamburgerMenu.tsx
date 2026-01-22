import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, User, LogOut, Trash2, Share2, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface HamburgerMenuProps {
  user: User;
  onLogout: () => void;
  onDeleteAll: () => void;
  onShareFeed: () => void;
  onViewSharedFeeds: () => void;
}

export function HamburgerMenu({ user, onLogout, onDeleteAll, onShareFeed, onViewSharedFeeds }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
        aria-label="Menü"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-stone-700" />
        ) : (
          <Menu className="w-6 h-6 text-stone-700" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-stone-200 overflow-hidden z-50">
          {/* User Profile Section */}
          <div className="px-4 py-4 bg-stone-50 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-stone-700 rounded-full flex items-center justify-center text-stone-100 font-semibold text-lg">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 truncate">
                  {user.name || 'Felhasználó'}
                </p>
                <p className="text-sm text-stone-600 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                onShareFeed();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                <Share2 className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-stone-900">Feed megosztása</p>
                <p className="text-xs text-stone-600">Oszd meg másokkal a feeded</p>
              </div>
            </button>

            <button
              onClick={() => {
                onViewSharedFeeds();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                <Users className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-stone-900">Megosztott feedek</p>
                <p className="text-xs text-stone-600">Nézd meg, ki mit osztott meg veled</p>
              </div>
            </button>

            <div className="my-2 border-t border-stone-200"></div>

            <button
              onClick={() => {
                onDeleteAll();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <Trash2 className="w-5 h-5" />
              <span>Képek törlése az adatbázisból</span>
            </button>

            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center transition-colors">
                <LogOut className="w-5 h-5 text-stone-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-stone-900">Kijelentkezés</p>
                <p className="text-xs text-stone-600">Profil váltás vagy kilépés</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}