import bcrypt from "bcryptjs";
async function CreateHashedPassword(password: string) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

export {CreateHashedPassword}
