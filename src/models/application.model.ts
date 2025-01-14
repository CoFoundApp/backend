export class Application {
    id: number;
    isRefused: boolean;
    isAccepted: boolean;
    description: string;
    userId: number;
    projectId: number;
    
    constructor(id: number, description: string, userId: number, projectId: number, isRefused: boolean = false, isAccepted: boolean = false) {
        this.id = id;
        this.isRefused = isRefused;
        this.isAccepted = isAccepted;
        this.description = description;
        this.userId = userId;
        this.projectId = projectId;
    }
  }