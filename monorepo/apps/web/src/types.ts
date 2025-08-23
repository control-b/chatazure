// Shared lightweight types for the chat/demo UI

export type UserRole = "owner" | "dispatcher" | "driver" | "clerk";
export type UserStatus = "active" | "inactive";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastSeenAt?: string | number | Date;
};

export type RoomType = "public" | "private";

export type Room = {
  id: string;
  name: string;
  type: RoomType;
  orgId: string;
};
