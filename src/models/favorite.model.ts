export class Favorites {
    projectId: number;
    userId: number;

    constructor(projectId: number, userId: number) {
        this.projectId = projectId;
        this.userId = userId;
    }
}

export class FavoritesByUser {
    userId: number;
    projects: number[]

    constructor(userId: number, projects: number[]) {
        this.userId = userId;
        this.projects = projects;
    }

    addProject(projectId: number) {
        this.projects.push(projectId);
    }
}

export class FavoritesByProject {
    projectId: number;
    users: number[]

    constructor(projectId: number, users: number[]) {
        this.projectId = projectId;
        this.users = users;
    }

    addUser(userId: number) {
        this.users.push(userId);
    }
}