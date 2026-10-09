import clsx from "clsx"

export function Block({ className }: { className?: string }) {
	return <div className={clsx("skeleton rounded-xl", className)} />
}

function PanelSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
	return (
		<div className={clsx("panel p-5", className)}>
			<Block className="mb-5 h-3 w-28" />
			<div className="grid gap-3">
				{Array.from({ length: rows }, (_, i) => (
					<Block key={i} className="h-9" />
				))}
			</div>
		</div>
	)
}

export function KpiSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
			{Array.from({ length: 8 }, (_, i) => (
				<div key={i} className="panel p-4 sm:p-5">
					<Block className="h-2.5 w-20" />
					<Block className="mt-3 h-8 w-24" />
					<Block className="mt-2 h-2.5 w-32" />
					<Block className="mt-4 h-7 w-full" />
				</div>
			))}
		</div>
	)
}

export function OverviewSkeleton() {
	return (
		<div className="grid gap-3 sm:gap-4">
			<KpiSkeleton />
			<div className="grid gap-3 sm:gap-4 lg:grid-cols-[2fr_1fr]">
				<div className="panel p-5">
					<Block className="mb-5 h-3 w-32" />
					<Block className="h-[240px]" />
				</div>
				<PanelSkeleton rows={5} />
			</div>
			<div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
				<PanelSkeleton />
				<PanelSkeleton />
				<PanelSkeleton />
			</div>
		</div>
	)
}

export function GridSkeleton({ cards = 6 }: { cards?: number }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: cards }, (_, i) => (
				<div key={i} className="panel overflow-hidden p-0">
					<Block className="h-36 rounded-none" />
					<div className="grid gap-3 p-4">
						<Block className="h-3 w-40" />
						<Block className="h-12" />
					</div>
				</div>
			))}
		</div>
	)
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
	return (
		<div className="grid gap-2">
			{Array.from({ length: rows }, (_, i) => (
				<Block key={i} className="h-[70px] rounded-[18px]" />
			))}
		</div>
	)
}

export function TableSkeleton() {
	return (
		<div className="grid gap-4">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => (
					<div key={i} className="panel p-4">
						<Block className="h-2.5 w-16" />
						<Block className="mt-3 h-7 w-20" />
						<Block className="mt-3 h-1.5" />
					</div>
				))}
			</div>
			<PanelSkeleton rows={8} />
		</div>
	)
}

export function TwoColumnSkeleton() {
	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<PanelSkeleton className="lg:col-span-2" rows={10} />
			<PanelSkeleton rows={6} />
		</div>
	)
}

export function ErrorBox({ message }: { message: string }) {
	return (
		<div className="panel py-16 text-center text-[14px] text-fg-3">{message}</div>
	)
}
