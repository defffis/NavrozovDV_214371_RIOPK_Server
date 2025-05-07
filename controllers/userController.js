import userModel from '../models/userModel.js';
import JWT from "jsonwebtoken";

const createToken = (_id) => {
  return JWT.sign({ _id }, process.env.SECRET, { expiresIn: '1d' })
}

//login
export const loginConroller = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(404).send({
        success: false,
        message: "Invalid email or password",
      });
    }
    const checkedUser = await userModel.findOne({ email });
    if (!checkedUser) {
      return res.status(404).send({
        success: false,
        message: "Email is not registerd",
      });
    }
    const user = await userModel.login(email, password)

    const token = createToken(user._id)

    res.status(200).json({ user, token })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

//signup
export const signupConroller = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password ) {
      return res.status(404).send({
        success: false,
        message: "All parameter must be fill",
      });
    }

    const user = await userModel.signup(name, email, password)

    // create a token
    const token = createToken(user._id)

    res.status(200).json({ user, token })

  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

