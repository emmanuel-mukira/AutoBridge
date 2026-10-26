import { Router } from "express";
import { requireAuth, requireCsrf, requireTrustedOrigin } from "../middleware/auth.js";
import * as controller from "../controllers/opportunity.controller.js";
import * as predictionController from "../controllers/opportunityPrediction.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/products", controller.products);
router.get("/owners", controller.owners);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.get("/:id/predictions", predictionController.history);
router.get("/:id/predictions/:predictionId/reviews", predictionController.reviews);
router.post("/", requireTrustedOrigin, requireCsrf, controller.create);
router.post("/:id/score", requireTrustedOrigin, requireCsrf, predictionController.score);
router.post("/:id/predictions/:predictionId/reviews", requireTrustedOrigin, requireCsrf, predictionController.review);
router.patch("/:id/stage", requireTrustedOrigin, requireCsrf, controller.transition);
router.patch("/:id/confirmed-sale", requireTrustedOrigin, requireCsrf, controller.correctConfirmedSale);
router.patch("/:id", requireTrustedOrigin, requireCsrf, controller.update);

export default router;
