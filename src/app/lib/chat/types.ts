/** Shapes match server/src/chat/chat.service.ts */
export type ChannelKind = 'dm' | 'group';

export interface ChatMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  joined_at: string;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  sender?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface ChatChannelSummary {
  id: string;
  kind: ChannelKind;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members: ChatMember[];
  unread_count: number;
  last_message?: ChatMessage | null;
  last_read_at: string | null;
}

export interface PersonSummary {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface UploadUrlResponse {
  path: string;
  uploadUrl: string;
  token: string;
  publicUrl: string;
}
