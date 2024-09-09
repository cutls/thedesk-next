export type Timeline = {
	id: number
	kind: TimelineKind
	name: string
	sort: number
	server_id: number
	list_id: string | null
	column_width: ColumnWidth | number
	column_height?: number
	color?: Color
	tts?: boolean
	mediaOnly?: boolean
	stacked?: boolean
}
export type AddTimeline = {
	kind: TimelineKind
	name: string
	listId?: string
	columnWidth: ColumnWidth | number
}
export const colorList = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet'] as const
export type Color = (typeof colorList)[number]
export type TimelineKind = 'home' | 'notifications' | 'local' | 'public' | 'favourites' | 'list' | 'bookmarks' | 'direct' | 'tag'
export const columnWidthSet = ['xs', 'sm', 'md', 'lg'] as const
export type ColumnWidth = (typeof columnWidthSet)[number]

export function columnWidth(width: ColumnWidth | number) {
	if (typeof width === 'number') return width
	switch (width) {
		case 'xs':
			return 280
		case 'sm':
			return 340
		case 'md':
			return 420
		case 'lg':
			return 500
		default:
			return 340
	}
}
