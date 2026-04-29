import { MobileTopBar } from '../components/MobileTopBar';
import { Search, Plus, Users, MessageCircle, ArrowLeft, Paperclip, Smile, Send } from 'lucide-react';
import { useState } from 'react';

interface ChatConversation {
  id: string;
  name: string;
  type: 'group' | 'dm';
  lastMessage: string;
  timestamp: string;
  unread: number;
  members?: number;
  online?: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
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
    name: 'Jordan Lee',
    type: 'dm',
    lastMessage: 'Thanks for the update!',
    timestamp: '3h ago',
    unread: 0,
    online: false
  }
];

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Alex Morgan',
    content: 'Hey! Just finished the authentication module.',
    timestamp: '10:30 AM',
    isOwn: false
  },
  {
    id: '2',
    sender: 'You',
    content: 'Great work! I\'ll review it this afternoon.',
    timestamp: '10:32 AM',
    isOwn: true
  },
  {
    id: '3',
    sender: 'Alex Morgan',
    content: 'Perfect! Let me know if you need anything.',
    timestamp: '10:35 AM',
    isOwn: false
  }
];

export function ChatMobile() {
  const [view, setView] = useState<'list' | 'conversation'>('list');
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'direct'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const filteredConversations = mockConversations.filter((chat) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      (activeTab === 'groups' && chat.type === 'group') ||
      (activeTab === 'direct' && chat.type === 'dm');
    return matchesSearch && matchesTab;
  });

  const handleSelectChat = (chat: ChatConversation) => {
    setSelectedChat(chat);
    setView('conversation');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedChat(null);
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput('');
    }
  };

  if (view === 'conversation' && selectedChat) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        {/* Conversation Header */}
        <div className="bg-surface border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToList} className="p-2 -ml-2 hover:bg-surface-hover rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </button>
            
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
              selectedChat.type === 'group' ? 'bg-accent' : 'bg-[#9333EA]'
            }`}>
              {selectedChat.type === 'group' ? (
                <Users className="w-5 h-5" />
              ) : (
                selectedChat.name.substring(0, 2).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {selectedChat.name}
              </h2>
              {selectedChat.type === 'group' && selectedChat.members && (
                <p className="text-xs text-text-tertiary">{selectedChat.members} members</p>
              )}
              {selectedChat.type === 'dm' && (
                <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedChat.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  {selectedChat.online ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mockMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {!message.isOwn && (
                  <div className="w-8 h-8 rounded-full bg-[#9333EA] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {message.sender.substring(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Message Content */}
                <div className="flex flex-col gap-1">
                  {!message.isOwn && (
                    <span className="text-xs font-medium text-text-secondary">{message.sender}</span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-lg ${
                      message.isOwn
                        ? 'bg-accent text-white'
                        : 'bg-surface text-text-primary'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  <span className={`text-xs text-text-tertiary ${message.isOwn ? 'text-right' : 'text-left'}`}>
                    {message.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#9333EA] flex items-center justify-center text-white text-xs font-semibold">
              AM
            </div>
            <div className="bg-surface px-4 py-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-surface border-t border-border-subtle p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-surface-sunken border border-border-subtle rounded-lg overflow-hidden">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-sm"
                style={{ maxHeight: '80px' }}
              />
              <div className="flex items-center gap-2 px-3 pb-2">
                <button className="p-2 hover:bg-surface-hover rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-text-secondary" />
                </button>
                <button className="p-2 hover:bg-surface-hover rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Smile className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="p-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <MobileTopBar />

      <main className="pt-14">
        <div className="p-4">
          {/* Header */}
          <h1 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
            Messages
          </h1>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent min-h-[44px]"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === 'groups'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-secondary border border-border-subtle'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === 'direct'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-secondary border border-border-subtle'
              }`}
            >
              Direct
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium min-h-[44px]">
              <Plus className="w-5 h-5" />
              New {activeTab === 'groups' ? 'Group' : 'Message'}
            </button>
          </div>

          {/* Conversation List */}
          <div className="space-y-2">
            {filteredConversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className="w-full flex items-start gap-3 p-4 bg-surface rounded-lg hover:bg-surface-sunken transition-colors text-left min-h-[76px] border border-divider"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                    chat.type === 'group' ? 'bg-accent' : 'bg-[#9333EA]'
                  }`}>
                    {chat.type === 'group' ? (
                      <Users className="w-6 h-6" />
                    ) : (
                      chat.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  {chat.type === 'dm' && chat.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-surface rounded-full"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className={`text-base font-semibold truncate ${
                      chat.unread > 0 ? 'text-text-primary' : 'text-text-secondary'
                    }`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {chat.name}
                    </h3>
                    <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">{chat.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${
                      chat.unread > 0 ? 'text-text-secondary font-medium' : 'text-text-tertiary'
                    }`}>
                      {chat.lastMessage}
                    </p>
                    {chat.unread > 0 && (
                      <span className="ml-2 bg-accent text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[24px] text-center flex-shrink-0">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                  {chat.type === 'group' && chat.members && (
                    <p className="text-xs text-text-tertiary mt-1">{chat.members} members</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-text-tertiary text-sm">
              No conversations found
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
