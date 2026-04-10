import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	onRowClick,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	return (
		<div className="rounded-md border border-[var(--color-border)]">
			<table className="w-full text-sm">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]"
								>
									{header.isPlaceholder ? null : (
										<button
											type="button"
											className={cn(
												"flex items-center gap-1",
												header.column.getCanSort() && "cursor-pointer select-none",
											)}
											onClick={header.column.getToggleSortingHandler()}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											{header.column.getCanSort() &&
												(header.column.getIsSorted() === "asc" ? (
													<ArrowUp className="h-3 w-3" />
												) : header.column.getIsSorted() === "desc" ? (
													<ArrowDown className="h-3 w-3" />
												) : (
													<ArrowUpDown className="h-3 w-3 opacity-30" />
												))}
										</button>
									)}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length}
								className="px-4 py-8 text-center text-[var(--color-text-tertiary)]"
							>
								No data
							</td>
						</tr>
					) : (
						table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								className={cn(
									"border-b border-[var(--color-border)] last:border-0",
									onRowClick &&
										"cursor-pointer hover:bg-[var(--color-bg-secondary)]",
								)}
								onClick={() => onRowClick?.(row.original)}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-4 py-3">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
