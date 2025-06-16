import {Router} from 'express'
import {participate} from "../controllers/participateController";


const router = Router()

// @ts-ignore
router.post('/participate', participate)

export const participationRoutes = router