export interface Profil {
    id: bigint;
    notifEmail: boolean;
    notifPhone: boolean;
    availability: string;
    location: string;
    userId: bigint;
    topicId?: bigint;
    notifPush: boolean;
  }