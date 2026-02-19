import { Router } from "express";
import { readPhotosets } from "../services/photosets.service";

export function createPhotosetsRouter(assetsDir: string) {
  const router = Router();

  router.get("/", (_req, res) => {
    const sets = readPhotosets(assetsDir);
    res.json(sets);
  });

  return router;
}
