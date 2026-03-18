import { Search, Settings, ChevronDown, Users, Paperclip, Smile, Send, MoreVertical, ThumbsUp, Heart, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { ChatConversation } from '../../pages/Chat';

interface ChatPanelProps {
  selectedChat: ChatConversation | null;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  read?: boolean;
  reactions?: Array<{ emoji: string; count: number }>;
}

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Alex Morgan',
    content: 'Hey team! Just finished the authentication module. Ready for review.',
    timestamp: '10:30 AM',
    isOwn: false,
    read: true
  },
  {
    id: '2',
    sender: 'You',
    content: 'Great work! I\'ll take a look at the PR this afternoon.',
    timestamp: '10:32 AM',
    isOwn: true,
    read: true,
    reactions: [{ emoji: '👍', count: 2 }]
  },
  {
    id: '3',
    sender: 'Jordan Lee',
    content: 'I can help with testing if needed. Should be free after lunch.',
    timestamp: '10:35 AM',
    isOwn: false,
    read: true
  },
  {
    id: '4',
    sender: 'You',
    content: 'That would be perfect! Let\'s sync up around 2 PM?',
    timestamp: '10:37 AM',
    isOwn: true,
    read: true
  },
  {
    id: '5',
    sender: 'Sarah Chen',
    content: '@You Don\'t forget about the design review meeting at 3 PM today.',
    timestamp: '11:15 AM',
    isOwn: false,
    read: false,
    reactions: [{ emoji: '❤️', count: 1 }]
  }
];

export function ChatPanel({ selectedChat }: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState('');
  const [showThreadDropdown, setShowThreadDropdown] = useState(false);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Handle sending message
      setMessageInput('');
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F8FA]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            No conversation selected
          </h3>
          <p className="text-sm text-gray-500">
            Choose a conversation from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
            selectedChat.type === 'group' ? 'bg-[#204EA7]' : 'bg-[#9333EA]'
          }`}>
            {selectedChat.type === 'group' ? (
              <Users className="w-5 h-5" />
            ) : (
              selectedChat.name.substring(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}>
              {selectedChat.name}
            </h2>
            {selectedChat.type === 'group' && selectedChat.members && (
              <p className="text-sm text-gray-500">{selectedChat.members} members</p>
            )}
            {selectedChat.type === 'dm' && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedChat.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                {selectedChat.online ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Thread Dropdown */}
          {selectedChat.type === 'group' && (
            <div className="relative">
              <button
                onClick={() => setShowThreadDropdown(!showThreadDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                All Messages
                <ChevronDown className="w-4 h-4" />
              </button>
              {showThreadDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50">All Messages</button>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50">Thread: Sprint Planning</button>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50">Thread: Bug Fixes</button>
                  <div className="border-t border-gray-200 my-2"></div>
                  <button className="w-full px-4 py-2 text-sm text-left text-[#204EA7] hover:bg-gray-50">+ Create Thread</button>
                </div>
              )}
            </div>
          )}

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {mockMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[70%] ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              {!message.isOwn && (
                <div className="w-8 h-8 rounded-full bg-[#9333EA] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {message.sender.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Message Content */}
              <div className="flex flex-col gap-1">
                {!message.isOwn && (
                  <span className="text-xs font-medium text-gray-700">{message.sender}</span>
                )}
                <div className="group relative">
                  <div
                    className={`px-4 py-2.5 rounded-lg ${
                      message.isOwn
                        ? 'bg-[#204EA7] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content.includes('@You') ? (
                        <>
                          {message.content.split('@You')[0]}
                          <span className="bg-yellow-200/50 px-1 rounded text-gray-900">@You</span>
                          {message.content.split('@You')[1]}
                        </>
                      ) : (
                        message.content
                      )}
                    </p>
                  </div>

                  {/* Hover Actions */}
                  <div className={`absolute ${message.isOwn ? 'left-0' : 'right-0'} top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <ThumbsUp className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Heart className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {message.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors"
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-gray-600">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-2 text-xs text-gray-500 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <span>{message.timestamp}</span>
                  {message.isOwn && message.read && (
                    <CheckCheck className="w-3.5 h-3.5 text-[#204EA7]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#9333EA] flex items-center justify-center text-white text-xs font-semibold">
            JL
          </div>
          <div className="bg-gray-100 px-4 py-3 rounded-lg">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-sm"
              style={{ maxHeight: '120px' }}
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                  <Smile className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <span className="text-xs text-gray-400">Enter to send</span>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="px-4 py-3 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
