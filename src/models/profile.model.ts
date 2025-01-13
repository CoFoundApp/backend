export class Profile {
    id: number;
    notifEmail: boolean;
    notifPhone: boolean;
    availability: string;
    location: string;
    userId: number;
    topicId?: number;
    notifPush: boolean;

    constructor(
      id: number,
      notifEmail: boolean,
      notifPhone: boolean,
      availability: string,
      location: string,
      userId: number,
      notifPush: boolean,
      topicId?: number
    ) {
      this.id = id;
      this.notifEmail = notifEmail;
      this.notifPhone = notifPhone;
      this.availability = availability;
      this.location = location;
      this.userId = userId;
      this.topicId = topicId;
      this.notifPush = notifPush;
    }
}

export class ProfileResponse {
    id: number;
    availability: string;
    location: string;
    userId: number;

    constructor(profile: Profile) {
      this.id = profile.id;
      this.availability = profile.availability;
      this.location = profile.location;
      this.userId = profile.userId;
    }
}
