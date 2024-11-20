export interface Notification {
    id: bigint;
    userId: bigint;
    emitterProjetId?: bigint;
    emitterUserId?: bigint;
    link?: string;
    seen: boolean;
    description: string;
  }