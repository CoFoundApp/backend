export class Topic {
    id: number;
    name: string;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

export class TopicWithProjects {
  id: number;
  projects: number[];

  constructor(id: number, projects: number[]) {
    this.id = id;
    this.projects = projects;
  }
}