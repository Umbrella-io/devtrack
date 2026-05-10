import { Router } from "express";
import { githubCallback, githubSignIn } from "../controllers/githubController";

const router = Router();

// GET /api/v1/auth/github
// Starts GitHub OAuth by redirecting to GitHub's authorization page
router.get("/github", githubSignIn);

// GET /api/v1/auth/github/callback
// Exchanges GitHub OAuth code for access token, redirects back to the client
router.get("/github/callback", githubCallback);

export default router;
