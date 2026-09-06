import React, { useState } from 'react';
import { ChatSession, UserProfile } from '../types';
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  PanelLeftClose,
  SlidersHorizontal,
} from 'lucide-react';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onClearAllSessions: () => void;
  currentProfile: UserProfile;
  onOpenProfileModal: () => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onClearAllSessions,
  currentProfile,
  onOpenProfileModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [triageFilter, setTriageFilter] = useState<'all' | 'emergency' | 'urgent' | 'routine'>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const startRenaming = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleValue(session.title);
  };

  const handleSaveRename = (sessionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitleValue.trim()) {
      onRenameSession(sessionId, editTitleValue.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (triageFilter === 'emergency') {
      return (
        s.triageLevel?.includes('Level 4') ||
        s.messages.some((m) => m.triageLevel?.includes('Level 4') || m.isEmergencyOverride)
      );
    }
    if (triageFilter === 'urgent') {
      return (
        s.triageLevel?.includes('Level 3') ||
        s.messages.some((m) => m.triageLevel?.includes('Level 3'))
      );
    }
    if (triageFilter === 'routine') {
      return (
        s.triageLevel?.includes('Level 1') ||
        s.triageLevel?.includes('Level 2') ||
        (!s.triageLevel && !s.messages.some((m) => m.triageLevel?.includes('Level 4')))
      );
    }
    return true;
  });

  // Group sessions by date
  const groupSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 86400000 * 7;

    const groups: {
      today: ChatSession[];
      yesterday: ChatSession[];
      last7Days: ChatSession[];
      older: ChatSession[];
    } = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: [],
    };

    filteredSessions.forEach((s) => {
      const time = new Date(s.updatedAt || s.createdAt).getTime();
      if (time >= today) {
        groups.today.push(s);
      } else if (time >= yesterday) {
        groups.yesterday.push(s);
      } else if (time >= last7Days) {
        groups.last7Days.push(s);
      } else {
        groups.older.push(s);
      }
    });

    return groups;
  };

  const grouped = groupSessions();

  const getTriageBadge = (session: ChatSession) => {
    const isEmerg =
      session.triageLevel?.includes('Level 4') ||
      session.messages.some((m) => m.triageLevel?.includes('Level 4') || m.isEmergencyOverride);
    const isUrgent =
      session.triageLevel?.includes('Level 3') ||
      session.messages.some((m) => m.triageLevel?.includes('Level 3'));

    if (isEmerg) {
      return (
        <span className="text-[11px] font-semibold text-rose-400 border border-rose-500/40 bg-rose-950/40 px-2.5 py-0.5 rounded-lg">
          Emergency
        </span>
      );
    }
    if (isUrgent) {
      return (
        <span className="text-[11px] font-semibold text-amber-400 border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 rounded-lg">
          Urgent
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold text-teal-400 border border-teal-500/40 bg-teal-950/40 px-2.5 py-0.5 rounded-lg">
        Routine
      </span>
    );
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `${day} ${month}`;
    } catch {
      return 'Recent';
    }
  };

  const renderSessionCard = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    const isEditing = editingSessionId === session.id;

    return (
      <div
        key={session.id}
        id={`session-item-${session.id}`}
        onClick={() => {
          if (!isEditing) {
            onSelectSession(session.id);
          }
        }}
        className={`group relative rounded-xl p-3 mb-2 transition-all cursor-pointer border ${
          isActive
            ? 'border-teal-500 bg-[#08202b] shadow-xs'
            : 'border-slate-800 bg-[#0f172a] hover:border-slate-700'
        }`}
      >
        {isEditing ? (
          <form
            onSubmit={(e) => handleSaveRename(session.id, e)}
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              className="flex-1 text-xs font-semibold px-2 py-1 bg-slate-900 border border-teal-500 rounded-lg text-white focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="p-1 text-emerald-400 hover:bg-emerald-950 rounded"
              title="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancelRename}
              className="p-1 text-slate-400 hover:bg-slate-800 rounded"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                )}
                <h4
                  className="text-xs font-semibold text-white truncate"
                  title={session.title}
                >
                  {session.title}
                </h4>
              </div>

              {/* Action Buttons (Visible on hover or active) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => startRenaming(session, e)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Rename title"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Preview matching Image 1: Clock icon + "6 Sep · 2 msgs" and Routine badge */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {formatDateLabel(session.updatedAt || session.createdAt)} &middot; {session.messages.length} msgs
                </span>
              </div>

              {getTriageBadge(session)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container matching Image 1 */}
      <aside
        id="medtrack-chat-history-sidebar"
        className={`fixed lg:sticky top-0 lg:top-[57px] bottom-0 left-0 z-40 bg-[#0b1329] border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none h-screen lg:h-[calc(100vh-57px)] shrink-0 ${
          isOpen ? 'w-80 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
        }`}
      >
        {isOpen && (
          <div className="flex flex-col h-full w-80 min-w-[320px]">
            {/* Top Sidebar Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0b1329]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl border border-teal-500/40 bg-teal-950/40 text-teal-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Chat History
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {sessions.length} Saved Consultations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Close History Sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Primary Action: New Consultation Button */}
            <div className="p-3.5 border-b border-slate-800 space-y-3">
              <button
                id="sidebar-new-consultation-btn"
                type="button"
                onClick={() => {
                  onNewSession();
                  if (window.innerWidth < 1024) onToggle();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Consultation</span>
              </button>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search symptoms, tags & history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-2 text-xs bg-[#0f172a] border border-slate-700/80 rounded-xl text-white placeholder-slate-400 focus:outline-hidden focus:border-teal-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills matching Image 1: ALL, EMERGENCY, URGENT, ROUTINE */}
              <div className="flex items-center gap-1.5">
                {(['all', 'emergency', 'urgent', 'routine'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setTriageFilter(filterKey)}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider text-center transition-colors cursor-pointer ${
                      triageFilter === filterKey
                        ? 'bg-teal-500 text-white shadow-xs'
                        : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Session List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {filteredSessions.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-300">
                    No consultations found
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {searchQuery ? 'Try clearing your search query.' : 'Start your first consultation.'}
                  </p>
                </div>
              ) : (
                <>
                  {grouped.today.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                        TODAY
                      </div>
                      {grouped.today.map(renderSessionCard)}
                    </div>
                  )}

                  {grouped.yesterday.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                        YESTERDAY
                      </div>
                      {grouped.yesterday.map(renderSessionCard)}
                    </div>
                  )}

                  {grouped.last7Days.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                        PREVIOUS 7 DAYS
                      </div>
                      {grouped.last7Days.map(renderSessionCard)}
                    </div>
                  )}

                  {grouped.older.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                        OLDER
                      </div>
                      {grouped.older.map(renderSessionCard)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar Bottom Footer matching Image 1 */}
            <div className="p-3 border-t border-slate-800 bg-[#0b1329] space-y-2">
              {/* Active Profile Info Box */}
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-teal-500 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {currentProfile.name ? currentProfile.name.charAt(0) : 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {currentProfile.name || 'Alex Rivera'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {currentProfile.demographics.age}y &middot; BMI {currentProfile.metrics.bmi}
                    </p>
                  </div>
                </div>
                <SlidersHorizontal className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
              </button>

              {/* Clear History Trigger */}
              {confirmClearOpen ? (
                <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800 text-center">
                  <p className="text-[11px] font-bold text-rose-200">
                    Clear all history?
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllSessions();
                        setConfirmClearOpen(false);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700 cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearOpen(false)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                  <span>MedTrack DB Sync</span>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(true)}
                    className="hover:text-rose-400 transition-colors font-medium cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
