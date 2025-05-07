import express from 'express'

import {
	loginConroller,
	signupConroller,
} from '../controllers/userController.js'


const router = express.Router()
//login
router.post("/login", loginConroller)
//signup
router.post("/signup", signupConroller)


export default router