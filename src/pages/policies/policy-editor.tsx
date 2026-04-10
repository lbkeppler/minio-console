import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";

const TEMPLATE_POLICY = JSON.stringify(
	{
		Version: "2012-10-17",
		Statement: [
			{
				Effect: "Allow",
				Action: ["s3:GetObject"],
				Resource: ["arn:aws:s3:::*"],
			},
		],
	},
	null,
	2,
);

export function PolicyEditorPage() {
	const [searchParams] = useSearchParams();
	const name = searchParams.get("name") ?? "";
	const isNew = searchParams.get("new") === "true";

	const { getPolicy, createPolicy } = useAdminStore();
	const { addToast } = useToastStore();

	const [text, setText] = useState("");
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (isNew) {
			setText(TEMPLATE_POLICY);
			return;
		}
		if (!name) return;

		setLoading(true);
		getPolicy(name)
			.then((info) => {
				try {
					setText(JSON.stringify(JSON.parse(info.policy), null, 2));
				} catch {
					setText(info.policy);
				}
			})
			.catch((err) => {
				addToast({
					title: "Error loading policy",
					description: String(err),
					variant: "error",
				});
			})
			.finally(() => setLoading(false));
	}, [name, isNew, getPolicy, addToast]);

	async function handleSave() {
		try {
			JSON.parse(text);
		} catch {
			addToast({
				title: "Invalid JSON",
				description: "Please fix the JSON syntax before saving.",
				variant: "error",
			});
			return;
		}

		setSaving(true);
		try {
			await createPolicy(name, text);
			addToast({ title: `Policy "${name}" saved`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error saving policy",
				description: String(err),
				variant: "error",
			});
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex h-full flex-col space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link to="/policies">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-2xl font-semibold">
						{isNew ? "Create" : "Edit"} Policy: {name}
					</h1>
				</div>
				<Button onClick={handleSave} disabled={saving || loading} size="sm">
					{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
					Save
				</Button>
			</div>

			{loading ? (
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-secondary)]" />
				</div>
			) : (
				<textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					spellCheck={false}
					className="flex-1 resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
				/>
			)}
		</div>
	);
}
