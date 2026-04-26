import { redirect } from "next/navigation";

export default function MyUserRedirectPage() {
  redirect("/account");
}
