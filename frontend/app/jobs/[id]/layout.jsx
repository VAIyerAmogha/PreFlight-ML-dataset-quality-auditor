import WorkspaceShell from "../../../components/layout/WorkspaceShell";
import { WorkspaceProvider } from "../../../components/workspace/WorkspaceProvider";

export default function JobLayout({ children, params }) {
  return (
    <WorkspaceProvider jobId={params.id}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
