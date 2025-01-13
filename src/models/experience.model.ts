export class Experience {
    id: number;
    userId: number;
    description: string;
    endingDate?: Date;
    startingDate: Date;
    title: string;
    location: string;
    role: string;
    
    constructor(
      id: number,
      userId: number,
      description: string,
      endingDate: Date | undefined,
      startingDate: Date,
      title: string,
      location: string,
      role: string
    ) {
      this.id = id;
      this.userId = userId;
      this.description = description;
      this.endingDate = endingDate;
      this.startingDate = startingDate;
      this.title = title;
      this.location = location;
      this.role = role
    }
    
}