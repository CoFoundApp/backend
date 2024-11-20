export interface Application {
    id: bigint;
    isRefused: boolean;
    isAccepted: boolean;
    description: string;
    userId: bigint;
    projectId: bigint;
  }