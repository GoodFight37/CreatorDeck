export interface FriendRequest {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  recipientName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Friendship {
  id: string;
  friendId: string;
  friendName: string;
  createdAt: string; // ISO date string
}