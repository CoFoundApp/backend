export interface Notification {
    id: bigint;
    userId: bigint;
    emitterProjectId?: bigint;
    emitterUserId?: bigint;
    link?: string;
    seen: boolean;
    description: string;
    emissionDate: Date;
  }