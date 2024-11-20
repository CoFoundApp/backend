export interface Experience {
    id: bigint;
    userId: bigint;
    description: string;
    endingDate?: Date;
    startingDate: Date;
    title: string;
    location: string;
    role: string;
}