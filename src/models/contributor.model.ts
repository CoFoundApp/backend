export interface Contributor {
    id: bigint;
    endingDate?: Date;
    role: string;
    projectId: bigint;
    mission: string;
    userId: bigint;
    startingDate: Date;
  }