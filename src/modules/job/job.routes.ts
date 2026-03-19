import { Router } from "express"
import { jobController } from "./job.controller"

const router = Router()

router.post("/", (req, res) => void jobController.createJob(req, res))
router.get("/:id", (req, res) => void jobController.getJob(req, res))
router.get("/", (req, res) => void jobController.getAllJobs(req, res))

export default router
