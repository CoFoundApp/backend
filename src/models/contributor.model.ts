export class Contributor {
    id: number;
    endingDate?: Date;
    role: string;
    projectId: number;
    mission: string;
    userId: number;
    startingDate: Date;
    
    constructor(
      id: number,
      endingDate: Date | undefined,
      role: string,
      projectId: number,
      mission: string,
      userId: number,
      startingDate: Date
    ) {
        this.id = id;
        this.endingDate = endingDate;
        this.role = role;
        this.projectId = projectId;
        this.mission = mission;
        this.userId = userId;
        this.startingDate = startingDate;
    }
  }