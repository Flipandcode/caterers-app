import { redirect } from "next/navigation";

/**
 * The real app has no meaningful "/" screen — signed-out visitors belong at
 * /login, signed-in ones at /dashboard. Once auth is built (next phase),
 * this should check the session and redirect accordingly. For now it sends
 * everyone to /menus, the one screen that exists, so the deployed URL isn't
 * a dead end.
 */
export default function RootPage() {
  redirect("/menus");
}
