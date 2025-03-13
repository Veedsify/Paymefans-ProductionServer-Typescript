import bycryptjs from 'bcryptjs'
export default async function ComparePasswordHash(password: string, hash: string): Promise<boolean> {
      return bycryptjs.compareSync(password, hash)
}
