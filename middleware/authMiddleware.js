import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js"

//Protected Routes token base
export const requireSignIn = async (req, res, next) => {
  const { authorization } = req.headers
  if (!authorization) {
    return res.status(401).json({ error: 'Authorization token required' })
  }

  const token = authorization.split(' ')[1]

  try {
    const { _id } = JWT.verify(token, process.env.SECRET)

    req.user = await userModel.findOne({ _id }).select('_id')
    next();
  } catch (error) {
    console.log(error);
  }
};
