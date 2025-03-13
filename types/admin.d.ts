export type CheckForAdminResponse =
    | { message: string; error: true }
    | { id: number; userId: string; error: false };
