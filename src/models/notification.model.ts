export class Notification {
    id: number;
    userId: number;
    emitterProjectId?: number;
    emitterUserId?: number;
    link?: string;
    seen: boolean;
    description: string;
    emissionDate: Date;

    constructor(
        id: number,
        userId: number,
        seen: boolean,
        description: string,
        emissionDate: Date,
        emitterProjectId?: number,
        emitterUserId?: number,
        link?: string
    ) {
        this.id = id;
        this.userId = userId;
        this.emitterProjectId = emitterProjectId;
        this.emitterUserId = emitterUserId;
        this.link = link;
        this.seen = seen;
        this.description = description;
        this.emissionDate = emissionDate;
    }
  }