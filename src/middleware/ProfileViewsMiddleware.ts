import query from "@utils/prisma";
import { NextFunction, Request, Response } from "express";

export default async function ProfileViewsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.body.username) {
    res.status(400).json({ message: "Username is required", status: false });
    return;
  }
  const user = await query.user.findUnique({
    where: {
      username: req.body.username!.toString(),
    },
  });

  if (!user) {
    return next();
  }

  await query.profileView.create({
    data: {
      profile_id: user?.id,
      ip_address: req.ip,
      viewer_id: req.body.viewerId || null,
    },
  });

  return next();
}
