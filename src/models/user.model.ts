export class User {
  id: number;
  isAdmin: boolean;
  email: string;
  lastName: string;
  firstName: string;
  password: string;
  phoneNumber: number | null;
  username: string;

  constructor(data: Partial<User>) {
    this.id = data.id || 0;
    this.isAdmin = data.isAdmin || false;
    this.email = data.email || '';
    this.lastName = data.lastName || '';
    this.firstName = data.firstName || '';
    this.password = data.password || '';
    this.phoneNumber = data.phoneNumber || null;
    this.username = data.username || '';
  }
}
export class UserResponse {
  id: number;
  lastName: string;
  firstName: string;
  username: string;

  constructor(data: User) {
    this.id = data.id || 0;
    this.lastName = data.lastName || '';
    this.firstName = data.firstName || '';
    this.username = data.username || '';
  }
}