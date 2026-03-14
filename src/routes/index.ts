import { Router } from "express"
import jobRoutes from "../modules/job/job.routes"

const router = Router()

router.use("/job", jobRoutes)

export default router