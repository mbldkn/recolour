import type { Request, Response, NextFunction } from "express";

const VALID_ROLES = new Set(["operator", "manager"]);

export function getRole(req: Request): string | null {
  const role = req.headers["x-role"];
  if (typeof role === "string" && VALID_ROLES.has(role)) return role;
  return null;
}

export function requireRole(role: "operator" | "manager") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (getRole(req) !== role) {
      res.status(403).json({ error: `Forbidden: requires ${role} role` });
      return;
    }
    next();
  };
}
