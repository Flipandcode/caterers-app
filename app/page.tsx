import { redirect } from "next/navigation";

/**
 * The real app has no meaningful "/" screen. Rather than duplicate the
 * signed-in/signed-out check here, this redirects to /menus, which already
 * calls getActiveBusinessId() and will itself bounce signed-out visitors to
 * /login and signed-in-but-no-business users to /onboarding.
 */
export default function RootPage() {
  redirect("/menus");
}
