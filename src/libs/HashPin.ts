import bcrypt from "bcryptjs";
async function HashPin(pin: string) {
    const saltRounds = 12;
    return await bcrypt.hash(pin, saltRounds);
}
export { HashPin }
