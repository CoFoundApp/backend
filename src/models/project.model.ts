export interface Project {
    id: bigint;
    userId: bigint;
    endingDate?: Date;
    startingDate: Date;
    description: string;
    title: string;
}