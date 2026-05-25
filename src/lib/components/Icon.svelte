<script lang="ts" module>
	export type IconName =
		| 'arrow'
		| 'arrowLeft'
		| 'interviewer'
		| 'mentor'
		| 'opponent'
		| 'settings'
		| 'close'
		| 'thumbsUp'
		| 'spark'
		| 'reply'
		| 'copy'
		| 'share'
		| 'download'
		| 'pause'
		| 'shield'
		| 'globe'
		| 'zap'
		| 'scale'
		| 'hand'
		| 'check'
		| 'edit'
		| 'refresh'
		| 'message'
		| 'expand'
		| 'collapse'
		| 'key';
</script>

<script lang="ts">
	import {
		ArrowRight,
		ArrowLeft,
		MessageCircleQuestion,
		BookOpen,
		Swords,
		Settings,
		X,
		ThumbsUp,
		Sparkles,
		Reply,
		Copy,
		Share2,
		Download,
		Pause,
		ShieldCheck,
		Globe,
		Zap,
		Scale,
		Hand,
		Check,
		Pencil,
		RefreshCw,
		MessageSquare,
		Maximize2,
		Minimize2,
		Key
	} from '@lucide/svelte';

	interface Props {
		name: IconName;
		class?: string;
	}
	let { name, class: cls = '' }: Props = $props();

	const icons = {
		arrow: ArrowRight,
		arrowLeft: ArrowLeft,
		interviewer: MessageCircleQuestion,
		mentor: BookOpen,
		opponent: Swords,
		settings: Settings,
		close: X,
		thumbsUp: ThumbsUp,
		spark: Sparkles,
		reply: Reply,
		copy: Copy,
		share: Share2,
		download: Download,
		pause: Pause,
		shield: ShieldCheck,
		globe: Globe,
		zap: Zap,
		scale: Scale,
		hand: Hand,
		check: Check,
		edit: Pencil,
		refresh: RefreshCw,
		message: MessageSquare,
		expand: Maximize2,
		collapse: Minimize2,
		key: Key
	} as const;

	const Component = $derived(icons[name]);
</script>

<Component class={cls} />
