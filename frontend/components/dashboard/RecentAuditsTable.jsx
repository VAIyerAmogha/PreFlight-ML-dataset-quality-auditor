"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Tooltip } from "../ui/tooltip";
import { formatTimestamp, scoreLabelFromValue } from "../../lib/workspace";

export default function RecentAuditsTable({ history = [] }) {
  return (
    <div className="overflow-hidden rounded-b-2xl">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-950/40 hover:bg-slate-950/40">
              <TableHead className="px-5 py-4">Dataset</TableHead>
              <TableHead className="px-5 py-4">Score</TableHead>
              <TableHead className="px-5 py-4">Status</TableHead>
              <TableHead className="px-5 py-4">Timestamp</TableHead>
              <TableHead className="px-5 py-4">Rows × Columns</TableHead>
              <TableHead className="px-5 py-4 text-right">Workspace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((record) => (
              <TableRow key={record.jobId}>
                <TableCell className="px-5 py-4">
                  <Tooltip content={record.filename}>
                    <div className="max-w-[260px] truncate font-medium text-slate-100">{record.filename}</div>
                  </Tooltip>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Badge variant={Number(record.score) >= 85 ? "healthy" : Number(record.score) >= 70 ? "warning" : "critical"}>
                    {Number(record.score || 0).toFixed(0)} · {scoreLabelFromValue(record.score)}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Badge variant={record.status?.toLowerCase() === "completed" ? "healthy" : record.status?.toLowerCase() === "failed" ? "critical" : "info"}>
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-slate-400">{formatTimestamp(record.completedAt || record.createdAt)}</TableCell>
                <TableCell className="px-5 py-4 font-mono text-xs text-slate-400">{record.rowCount || 0} × {record.columnCount || 0}</TableCell>
                <TableCell className="px-5 py-4 text-right">
                  <Link className="text-sm font-medium text-slate-100 underline-offset-4 hover:underline" href={`/jobs/${record.jobId}/overview`}>
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
