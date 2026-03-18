import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useState } from 'react';

export interface ChatConversation {
  id: string;
  name: string;
  type: 'group' | 'dm';
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  members?: number;
  online?: boolean;
}

export function Chat() {
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      {/* Main Content */}
      <main className="ml-56 pt-16 h-screen flex">
        {/* Chat Sidebar */}
        <ChatSidebar 
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
        />

        {/* Main Chat Panel */}
        <ChatPanel selectedChat={selectedChat} />
      </main>
    </div>
  );
}
