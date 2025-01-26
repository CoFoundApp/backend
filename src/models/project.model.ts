export class Project {
    id: number;
    userId: number;
    endingDate?: Date;
    startingDate: Date;
    description: string;
    title: string;

    constructor(id: number, userId: number, startingDate: Date, description: string, title: string, endingDate?: Date) {
        this.id = id;
        this.userId = userId;
        this.startingDate = startingDate;
        this.description = description;
        this.title = title;
        this.endingDate = endingDate;
    }
}

export class ProjectWithTopics {
    id: number;
    topics: number[];

    constructor(id: number, topics: number[]) {
        this.id = id;
        this.topics = topics;
    }
}