import { Router } from "express"
import { jobController } from "./job.controller"

const router = Router()

router.post("/job", (req, res) => void jobController.createJob(req, res))
router.get("/job/:id", (req, res) => void jobController.getJob(req, res))

export default router
