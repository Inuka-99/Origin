import { Search, Plus, Users, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { ChatConversation } from '../../pages/Chat';

interface ChatSidebarProps {
  selectedChat: ChatConversation | null;
  onSelectChat: (chat: ChatConversation) => void;
}

const mockConversations: ChatConversation[] = [
  {
    id: '1',
    name: 'Design Team',
    type: 'group',
    lastMessage: 'Sarah: Updated the mockups for review',
    timestamp: '2m ago',
    unread: 3,
    members: 8
  },
  {
    id: '2',
    name: 'Engineering Sprint',
    type: 'group',
    lastMessage: 'Mike: Ready for deployment',
    timestamp: '15m ago',
    unread: 0,
    members: 12
  },
  {
    id: '3',
    name: 'Alex Morgan',
    type: 'dm',
    lastMessage: 'Can you review the PR?',
    timestamp: '1h ago',
    unread: 1,
    online: true
  },
  {
    id: '4',
    name: 'Product Launch',
    type: 'group',
    lastMessage: 'Emma: Marketing materials are ready',
    timestamp: '2h ago',
    unread: 0,
    members: 15
  },
  {
    id: '5',
    name: 'Jordan Lee',
    type: 'dm',
    lastMessage: 'Thanks for the update!',
    timestamp: '3h ago',
    unread: 0,
    online: false
  },
  {
    id: '6',
    name: 'Client Success',
    type: 'group',
    lastMessage: 'New client feedback received',
    timestamp: 'Yesterday',
    unread: 0,
    members: 6
  }
];

export function ChatSidebar({ selectedChat, onSelectChat }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'direct'>('all');

  const filteredConversations = mockConversations.filter((chat) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'groups' && chat.type === 'group') ||
      (activeTab === 'direct' && chat.type === 'dm');
    return matchesSearch && matchesTab;
  });

  const groups = filteredConversations.filter(c => c.type === 'group');
  const directMessages = filteredConversations.filter(c => c.type === 'dm');

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
          Messages
        </h2>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7] focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#204EA7] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'groups'
                ? 'bg-[#204EA7] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'bg-[#204EA7] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Direct
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Group
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <MessageCircle className="w-4 h-4" />
            New DM
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'all' && (
          <>
            {/* Groups Section */}
            {groups.length > 0 && (
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Groups ({groups.length})
                </h3>
                <div className="space-y-1">
                  {groups.map((chat) => (
                    <ConversationItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChat?.id === chat.id}
                      onSelect={() => onSelectChat(chat)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Direct Messages Section */}
            {directMessages.length > 0 && (
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Direct Messages ({directMessages.length})
                </h3>
                <div className="space-y-1">
                  {directMessages.map((chat) => (
                    <ConversationItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChat?.id === chat.id}
                      onSelect={() => onSelectChat(chat)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {(activeTab === 'groups' || activeTab === 'direct') && (
          <div className="p-4">
            <div className="space-y-1">
              {filteredConversations.map((chat) => (
                <ConversationItem
                  key={chat.id}
                  chat={chat}
                  isSelected={selectedChat?.id === chat.id}
                  onSelect={() => onSelectChat(chat)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredConversations.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            No conversations found
          </div>
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  chat: ChatConversation;
  isSelected: boolean;
  onSelect: () => void;
}

function ConversationItem({ chat, isSelected, onSelect }: ConversationItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
        isSelected
          ? 'bg-[#204EA7]/10 border border-[#204EA7]/20'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
          chat.type === 'group' ? 'bg-[#204EA7]' : 'bg-[#9333EA]'
        }`}>
          {chat.type === 'group' ? (
            <Users className="w-5 h-5" />
          ) : (
            chat.name.substring(0, 2).toUpperCase()
          )}
        </div>
        {chat.type === 'dm' && chat.online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className={`text-sm font-semibold truncate ${
            chat.unread > 0 ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {chat.name}
          </h4>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{chat.timestamp}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-xs truncate ${
            chat.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
          }`}>
            {chat.lastMessage}
          </p>
          {chat.unread > 0 && (
            <span className="ml-2 bg-[#204EA7] text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
              {chat.unread}
            </span>
          )}
        </div>
        {chat.type === 'group' && chat.members && (
          <p className="text-xs text-gray-400 mt-1">{chat.members} members</p>
        )}
      </div>
    </button>
  );
}
