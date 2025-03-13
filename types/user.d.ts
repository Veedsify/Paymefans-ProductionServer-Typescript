export interface AuthUser extends User {

};

export type RegisteredUser = {
    id: number;
    user_id: string;
    username: string;
    fullname: string
}
