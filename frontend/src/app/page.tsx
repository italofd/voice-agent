import PipecatRoot from "@/components";

export default function Home() {
	return (
		<div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
			<div className="container mx-auto h-full">
				<main className="h-full">
					<PipecatRoot />
				</main>
			</div>
		</div>
	);
}
