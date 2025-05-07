import mongoose from 'mongoose'
import validator from 'validator'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// static signup method
userSchema.statics.signup = async function (name, email, password) {

  if (!validator.isEmail(email)) {
    throw Error('Email not valid')
  }

  const exists = await this.findOne({ email })

  if (exists) {
    throw Error('Email already in use')
  }

  // const salt = await bcrypt.genSalt(10)
  // const hash = await bcrypt.hash(password, salt)

  // const user = await this.create({ email, password: hash })
  const user = await this.create({ name, email, password })

  return user
}

// static login method
userSchema.statics.login = async function (email, password) {

  if (!email || !password) {
    throw Error('All fields must be filled')
  }

  const user = await this.findOne({ email })
  if (!user) {
    throw Error('Incorrect email')
  }

  // const match = await bcrypt.compare(password, user.password)
  if (!password == user.password) {
    throw Error('Incorrect password')
  }

  return user
}

export default mongoose.model("User", userSchema);