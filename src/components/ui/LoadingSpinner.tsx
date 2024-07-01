import clsx from "clsx";
interface Props {
	size: "xxs" | "xs" | "sm" | "md" | "lg";
	colorMode?: "light" | "dark";
}
export function LoadingSectionspinner({ size, colorMode }: Props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			className={clsx("dark:text-gray-200 text-gray-300 animate-spin-fast", {
				"w-5 h-5": size === "xxs",
				"w-6 h-6": size === "xs",
				"w-8 h-8": size === "sm",
				"w-10 h-10": size === "md",
				"w-12 h-12": size === "lg",
				"dark:text-gray-200 text-radix-gray-10": colorMode === "light",
				"dark:text-radix-gray-10 text-radix-gray-4": colorMode === "dark",
			})}
		>
			<g transform="translate(1 1)" fillRule="nonzero" fill="none">
				<circle cx="11" cy="11" r="11"></circle>
				<path
					d="M10.998 22a.846.846 0 0 1 0-1.692 9.308 9.308 0 0 0 0-18.616 9.286 9.286 0 0 0-7.205 3.416.846.846 0 1 1-1.31-1.072A10.978 10.978 0 0 1 10.998 0c6.075 0 11 4.925 11 11s-4.925 11-11 11z"
					fill="currentColor"
				></path>
			</g>
		</svg>
	);
}
