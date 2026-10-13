import bcrypt from 'bcryptjs'

const password = process.argv[2]

if (!password) {
  console.log('Usage: node server/scripts/hashPassword.js <your_password>')
  process.exit(1)
}

const saltRounds = 12
const hash = bcrypt.hashSync(password, saltRounds)

console.log('\n=============================================')
console.log('Generated Bcrypt Hash for ADMIN_PASSWORD_HASH:')
console.log('=============================================')
console.log(hash)
console.log('=============================================\n')
console.log('Copy the hash above and paste it into your .env file:\n')
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`)
