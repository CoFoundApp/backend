export interface User {
  id: bigint;
  isAdmin: boolean;
  email: string;
  lastName: string;
  firstName: string;
  password: string;
  phoneNumber?: number;
  username: string;
}