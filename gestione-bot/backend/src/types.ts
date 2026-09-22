// types.ts
// Tipi condivisi in tutto il backend

export interface JwtPayload {
  telegram_id: number;
  username?: string;
  first_name?: string;
}

export interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}
