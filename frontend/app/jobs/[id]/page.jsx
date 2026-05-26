import { redirect } from "next/navigation";

export default function JobIndexPage({ params }) {
  redirect(`/jobs/${params.id}/overview`);
}
